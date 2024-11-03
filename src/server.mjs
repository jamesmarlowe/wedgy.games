import * as R from "ramda";
import crypto from "crypto";
import { shuffle, mode } from "./lib/utils";
import { THEMED_WORDS } from "./lib/words";
import { wordfind } from "./lib/wordfind";
import { pickPlayer, colorMap } from "./lib/avatars.js";
import { EVENTS, THEME_OPTIONS, WORDS_PER_ROUND } from "./lib/constants";

async function handleErrors(request, func) {
  try {
    return await func();
  } catch (err) {
    if (request.headers.get("Upgrade") == "websocket") {
      // Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
      // won't show us the response body! So... let's send a WebSocket response with an error
      // frame instead.
      let pair = new WebSocketPair();
      pair[1].accept();
      pair[1].send(JSON.stringify({error: err.stack}));
      pair[1].close(1011, "Uncaught exception during session setup");
      return new Response(null, { status: 101, webSocket: pair[0] });
    } else {
      return new Response(err.stack, {status: 500});
    }
  }
}

export default {
  async fetch(request, env) {
    return await handleErrors(request, async () => {
      // We have received an HTTP request! Parse the URL and route the request.

      let url = new URL(request.url);
      let path = url.pathname.slice(1).split('/');

      switch (path[0]) {
        case "api":
          // This is a request for `/api/...`, call the API handler.
          return handleApiRequest(path.slice(1), request, env);
        default:
          return new Response("Not found", {status: 404});
      }
    });
  }
}


async function handleApiRequest(path, request, env) {
  // We've received at API request. Route the request based on the path.

  switch (path[0]) {
    case "room": {
      // Request for `/api/room/...`.

      if (!path[1]) {
        // The request is for just "/api/room", with no ID.
        if (request.method == "POST") {
          let name = crypto.randomBytes(2).toString("hex");
          return new Response(name);
        } else {
          return new Response("Method not allowed", {status: 405});
        }
      }

      // OK, the request is for `/api/room/<name>/...`. It's time to route to the Durable Object
      // for the specific room.
      let name = path[1];

      // Each Durable Object has a 256-bit unique ID. IDs can be derived from string names, or
      // chosen randomly by the system.
      let id;
      if (name.match(/^[0-9a-f]{64}$/)) {
        // The name is 64 hex digits, so let's assume it actually just encodes an ID. We use this
        // for private rooms. `idFromString()` simply parses the text as a hex encoding of the raw
        // ID (and verifies that this is a valid ID for this namespace).
        id = env.rooms.idFromString(name);
      } else if (name.length <= 32) {
        // Treat as a string room name (limited to 32 characters). `idFromName()` consistently
        // derives an ID from a string.
        id = env.rooms.idFromName(name);
      } else {
        return new Response("Name too long", {status: 404});
      }

      // Get the Durable Object stub for this room! The stub is a client object that can be used
      // to send messages to the remote Durable Object instance. The stub is returned immediately;
      // there is no need to await it. This is important because you would not want to wait for
      // a network round trip before you could start sending requests. Since Durable Objects are
      // created on-demand when the ID is first used, there's nothing to wait for anyway; we know
      // an object will be available somewhere to receive our requests.
      let roomObject = env.rooms.get(id);

      // Compute a new URL with `/api/room/<name>` removed. We'll forward the rest of the path
      // to the Durable Object.
      let newUrl = new URL(request.url);
      newUrl.pathname = "/" + path.slice(2).join("/");

      // Send the request to the object. The `fetch()` method of a Durable Object stub has the
      // same signature as the global `fetch()` function, but the request is always sent to the
      // object, regardless of the request's URL.
      return roomObject.fetch(newUrl, request);
    }

    default:
      return new Response("Not found", {status: 404});
  }
}

// =======================================================================================
// The ChatRoom Durable Object Class

// ChatRoom implements a Durable Object that coordinates an individual chat room. Participants
// connect to the room using WebSockets, and the room broadcasts messages from each participant
// to all others.
export class ChatRoom {
  constructor(state, env) {
    this.state = state

    // `state.storage` provides access to our durable storage. It provides a simple KV
    // get()/put() interface.
    this.storage = state.storage;

    // `env` is our environment bindings (discussed earlier).
    this.env = env;

    // We will track metadata for each client WebSocket object in `sessions`.
    this.sessions = new Map();
    this.state.getWebSockets().forEach((webSocket) => {
      // The constructor may have been called when waking up from hibernation,
      // so get previously serialized metadata for any existing WebSockets.
      let meta = webSocket.deserializeAttachment();

      // Set up our rate limiter client.
      // The client itself can't have been in the attachment, because structured clone doesn't work on functions.
      // DO ids aren't cloneable, restore the ID from its hex string
      let limiterId = this.env.limiters.idFromString(meta.limiterId);
      let limiter = new RateLimiterClient(
        () => this.env.limiters.get(limiterId),
        err => webSocket.close(1011, err.stack));

      // We don't send any messages to the client until it has sent us the initial user info
      // message. Until then, we will queue messages in `session.blockedMessages`.
      // This could have been arbitrarily large, so we won't put it in the attachment.
      let blockedMessages = [];
      this.sessions.set(webSocket, { ...meta, limiter, blockedMessages });
    });

    // We keep track of the last-seen message's timestamp just so that we can assign monotonically
    // increasing timestamps even if multiple messages arrive simultaneously (see below). There's
    // no need to store this to disk since we assume if the object is destroyed and recreated, much
    // more than a millisecond will have gone by.
    this.lastTimestamp = 0;
  }

  // The system will call fetch() whenever an HTTP request is sent to this Object. Such requests
  // can only be sent from other Worker code, such as the code above; these requests don't come
  // directly from the internet. In the future, we will support other formats than HTTP for these
  // communications, but we started with HTTP for its familiarity.
  async fetch(request) {
    return await handleErrors(request, async () => {
      let url = new URL(request.url);

      switch (url.pathname) {
        case "/websocket": {
          // The request is to `/api/room/<name>/websocket`. A client is trying to establish a new
          // WebSocket session.
          if (request.headers.get("Upgrade") != "websocket") {
            return new Response("expected websocket", {status: 400});
          }

          // Get the client's IP address for use with the rate limiter.
          let ip = request.headers.get("CF-Connecting-IP");

          // To accept the WebSocket request, we create a WebSocketPair (which is like a socketpair,
          // i.e. two WebSockets that talk to each other), we return one end of the pair in the
          // response, and we operate on the other end. Note that this API is not part of the
          // Fetch API standard; unfortunately, the Fetch API / Service Workers specs do not define
          // any way to act as a WebSocket server today.
          let pair = new WebSocketPair();

          // We're going to take pair[1] as our end, and return pair[0] to the client.
          await this.handleSession(pair[1], ip);

          // Now we return the other end of the pair to the client.
          return new Response(null, { status: 101, webSocket: pair[0] });
        }

        default:
          return new Response("Not found", {status: 404});
      }
    });
  }

  // handleSession() implements our WebSocket-based chat protocol.
  async handleSession(webSocket, ip) {
    // Accept our end of the WebSocket. This tells the runtime that we'll be terminating the
    // WebSocket in JavaScript, not sending it elsewhere.
    this.state.acceptWebSocket(webSocket);

    // Set up our rate limiter client.
    let limiterId = this.env.limiters.idFromName(ip);
    let limiter = new RateLimiterClient(
        () => this.env.limiters.get(limiterId),
        err => webSocket.close(1011, err.stack));

    // Create our session and add it to the sessions map.
    let session = { limiterId, limiter, blockedMessages: [] };
    // attach limiterId to the webSocket so it survives hibernation
    webSocket.serializeAttachment({ ...webSocket.deserializeAttachment(), limiterId: limiterId.toString() });
    this.sessions.set(webSocket, session);

    // Queue "join" messages for all online users, to populate the client's roster.
    for (let otherSession of this.sessions.values()) {
      if (otherSession.name) {
        session.blockedMessages.push(JSON.stringify({joined: otherSession.name}));
      }
    }

    // Load the last 100 messages from the chat history stored on disk, and send them to the
    // client.
    let storage = await this.storage.list({reverse: true, limit: 100});
    let backlog = [...storage.values()];
    backlog.reverse();
    backlog.forEach(value => {
      session.blockedMessages.push(value);
    });
  }

  sendThemes = async () => {
    const themes = shuffle(
      R.without(await this.storage.get("usedThemes"), Object.keys(THEMED_WORDS))
    ).slice(0, THEME_OPTIONS);
    await this.storage.put("voteOptions", themes);
    this.broadcast({event: EVENTS.PRE_ROUND, themes});
  };

  resetRoom = async () => {

  }

  getKeyFromSessions = (key) => 
    R.pipe(
      Array.from,
      R.pluck(1),
      R.pluck(key)
    )(this.sessions);

  putInSession = (socket, key, value) => {
    this.sessions.get(socket)[key] = value
    socket.serializeAttachment({
      ...socket.deserializeAttachment(),
      [key]: value
    });
  }

  incrementSessionCount = async (socket, key) => {
    const value = (this.sessions.get(socket)[key]||0)+ 1
    this.sessions.get(socket)[key] = value
    socket.serializeAttachment({
      ...socket.deserializeAttachment(),
      [key]: value
    });
  }

  getSessionsWhereEq = (key, value) =>
    R.pipe(
      Array.from,
      R.filter(([_, obj]) => obj[key] === value),
      R.map(R.head)
    )(this.sessions);

  clearRound = async () => {
    this.sessions.forEach((sess, socket) => {
      sess.words = 0;
      sess.words = "";
      socket.serializeAttachment({
        ...socket.deserializeAttachment(),
        words: 0,
        vote: "",
      });
    });
  }

  async webSocketMessage(webSocket, msg) {
    try {
      let session = this.sessions.get(webSocket);
      if (session.quit) {
        // Whoops, when trying to send to this WebSocket in the past, it threw an exception and
        // we marked it broken. But somehow we got another message? I guess try sending a
        // close(), which might throw, in which case we'll try to send an error, which will also
        // throw, and whatever, at least we won't accept the message. (This probably can't
        // actually happen. This is defensive coding.)
        webSocket.close(1011, "WebSocket broken.");
        return;
      }

      // Check if the user is over their rate limit and reject the message if so.
      if (!session.limiter.checkLimit()) {
        webSocket.send(JSON.stringify({
          error: "Your IP is being rate-limited, please try again later."
        }));
        return;
      }

      // I guess we'll use JSON.
      let data = JSON.parse(msg);

      if (!session.name) {
        // The first message the client sends is the user info message with their name. Save it
        // into their session object.
        session.name = pickPlayer([]).avatar;
        // attach name to the webSocket so it survives hibernation
        webSocket.serializeAttachment({
          ...webSocket.deserializeAttachment(),
          name: session.name,
          color: colorMap[session.name],
          rounds: 0,
          words: 0
        });

        // Deliver all the messages we queued up since the user connected.
        session.blockedMessages.forEach(queued => {
          webSocket.send(queued);
        });
        delete session.blockedMessages;

        // Broadcast to all other connections that this user has joined.
        this.broadcast({joined: session.name});

        webSocket.send(JSON.stringify({ready: true, you: session.name, color:colorMap[session.name]}));
        return;
      }

      switch (data.event) {
        case EVENTS.EVERYONE_JOINED:
          await this.storage.put("usedThemes", []);
          await this.storage.put("usedWords", []);
          await this.storage.put("voteOptions", []);
          await this.storage.put("round", 0);
          await this.storage.put("availableWords", []);
          await this.storage.put("voting", false);
          const voting = await this.storage.get("voting")
          if (!voting){
            await this.storage.put("voting", true);
            this.sendThemes()
          }
          break;
        case EVENTS.VOTE:
          if ((await this.storage.get("voteOptions")).includes(data.selection)) {
            this.putInSession(webSocket, "vote", data.selection)
            this.broadcast({event: EVENTS.VOTE, player: session.name, selection: data.selection});
            if (Array.from(this.sessions).every((p) => p[1].vote)) {
              this.broadcast({event: EVENTS.VOTE_OVER});
              await this.storage.put("voting", false);
              this.broadcast({msg:"get theme", sessions:Array.from(this.sessions), vote:this.getKeyFromSessions("vote")})
              const theme = mode(this.getKeyFromSessions("vote"));
              const usedThemes = await this.storage.get("usedThemes")
              await this.storage.put("usedThemes", usedThemes.concat(theme));
              this.broadcast({msg:"shuffle"})
              const words = shuffle(THEMED_WORDS[theme]).slice(
                -WORDS_PER_ROUND[this.sessions.size]
              );
              const puzzle = wordfind.newPuzzleLax(words, {
                height: 13,
                width: 13,
                maxGridGrowth: 0,
                maxAttempts: 10,
                preferOverlap: true,
              });
              await this.storage.put("availableWords", words);
              this.broadcast({availableWords: words})
              await this.storage.put("usedWords", words);
              this.broadcast(
                {event: EVENTS.NEW_GAME,
                theme,
                words,
                puzzle,
                round: await this.storage.get("round") || 0}
              );
            }
          }
          break;
        case EVENTS.FOUND_WORD:
          let availableWords = await this.storage.get("availableWords")
          if (availableWords.includes(data.word)) {
            availableWords = R.without(
              [data.word],
              availableWords
            );
            await this.storage.put("availableWords", availableWords)
            await this.incrementSessionCount(webSocket, "words")
            this.broadcast({msg: this.getKeyFromSessions("words")})
            this.broadcast({event: EVENTS.FOUND_WORD, word:data.word, start:data.start, end:data.end, player: {color: colorMap[session.name], name: session.name}});
            if (availableWords.length === 0) {
            // if (availableWords.length) { //!!!!TODO!!!!!this is to make testing faster
              const max = Math.max(...this.getKeyFromSessions("words"));
              this.broadcast({max:max, sessions:Array.from(this.sessions)});
              // const winners = R.filter(R.whereEq({words:max}),R.pluck(1, Array.from(this.sessions)))
              const winners = this.getSessionsWhereEq("words", max)
              this.broadcast({winners:winners});
              if (winners.length > 1) {
                const theme = (await this.storage.get("usedThemes")).at(-1)
                const words = R.without(
                  await this.storage.get("usedWords"),
                  shuffle(THEMED_WORDS[theme])
                ).slice(-1);
                const puzzle = wordfind.newPuzzleLax(words, {
                  height: 13,
                  width: 13,
                  maxGridGrowth: 0,
                  maxAttempts: 10,
                  preferOverlap: true,
                });
                await this.storage.put("availableWords", words)
                this.broadcast({
                  event: EVENTS.POST_ROUND,
                  theme,
                  words,
                  puzzle,
                  round: await this.storage.get("round")
                });
              } else {
                let round = await this.storage.get("round") + 1
                await this.storage.put("round", round)
                await this.clearRound();
                await this.incrementSessionCount(winners[0],"round")
                const roundWinner = this.sessions.get(winners[0])
                this.broadcast({event: EVENTS.CHANGE_SCORE, player: {color: colorMap[roundWinner.name], name: roundWinner.name, rounds:roundWinner.rounds}});
                if (round < 3) {
                  this.sendThemes();
                } else {
                  const maxRound =  Math.max(...this.getKeyFromSessions("rounds"))
                  const gameWinner = this.sessions.get(this.getSessionsWhereEq("rounds", maxRound)).name
                  this.broadcast({event: EVENTS.GAME_OVER, name:gameWinner});
                  this.resetRoom();
                }
              }
            }
          }
          break;
        default:
          return;
      }
    } catch (err) {
      // Report any exceptions directly back to the client. As with our handleErrors() this
      // probably isn't what you'd want to do in production, but it's convenient when testing.
      webSocket.send(JSON.stringify({error: err.stack}));
    }
  }

  // On "close" and "error" events, remove the WebSocket from the sessions list and broadcast
  // a quit message.
  async closeOrErrorHandler(webSocket) {
    let session = this.sessions.get(webSocket) || {};
    session.quit = true;
    this.sessions.delete(webSocket);
    if (session.name) {
      this.broadcast({quit: session.name});
    }
  }

  async webSocketClose(webSocket, code, reason, wasClean) {
    this.closeOrErrorHandler(webSocket)
  }

  async webSocketError(webSocket, error) {
    this.closeOrErrorHandler(webSocket)
  }

  // broadcast() broadcasts a message to all clients.
  broadcast(message) {
    // Apply JSON if we weren't given a string to start with.
    if (typeof message !== "string") {
      message = JSON.stringify(message);
    }

    // Iterate over all the sessions sending them messages.
    let quitters = [];
    this.sessions.forEach((session, webSocket) => {
      if (session.name) {
        try {
          webSocket.send(message);
        } catch (err) {
          // Whoops, this connection is dead. Remove it from the map and arrange to notify
          // everyone below.
          session.quit = true;
          quitters.push(session);
          this.sessions.delete(webSocket);
        }
      } else {
        // This session hasn't sent the initial user info message yet, so we're not sending them
        // messages yet (no secret lurking!). Queue the message to be sent later.
        session.blockedMessages.push(message);
      }
    });

    quitters.forEach(quitter => {
      if (quitter.name) {
        this.broadcast({quit: quitter.name});
      }
    });
  }
}

// =======================================================================================
// The RateLimiter Durable Object class.

// RateLimiter implements a Durable Object that tracks the frequency of messages from a particular
// source and decides when messages should be dropped because the source is sending too many
// messages.
//
// We utilize this in ChatRoom, above, to apply a per-IP-address rate limit. These limits are
// global, i.e. they apply across all chat rooms, so if a user spams one chat room, they will find
// themselves rate limited in all other chat rooms simultaneously.
export class RateLimiter {
  constructor(state, env) {
    // Timestamp at which this IP will next be allowed to send a message. Start in the distant
    // past, i.e. the IP can send a message now.
    this.nextAllowedTime = 0;
  }

  // Our protocol is: POST when the IP performs an action, or GET to simply read the current limit.
  // Either way, the result is the number of seconds to wait before allowing the IP to perform its
  // next action.
  async fetch(request) {
    return await handleErrors(request, async () => {
      let now = Date.now() / 1000;

      this.nextAllowedTime = Math.max(now, this.nextAllowedTime);

      if (request.method == "POST") {
        // POST request means the user performed an action.
        // We allow one action per 5 seconds.
        this.nextAllowedTime += 5;
      }

      // Return the number of seconds that the client needs to wait.
      //
      // We provide a "grace" period of 20 seconds, meaning that the client can make 4-5 requests
      // in a quick burst before they start being limited.
      let cooldown = Math.max(0, this.nextAllowedTime - now - 20);
      return new Response(cooldown);
    })
  }
}

// RateLimiterClient implements rate limiting logic on the caller's side.
class RateLimiterClient {
  // The constructor takes two functions:
  // * getLimiterStub() returns a new Durable Object stub for the RateLimiter object that manages
  //   the limit. This may be called multiple times as needed to reconnect, if the connection is
  //   lost.
  // * reportError(err) is called when something goes wrong and the rate limiter is broken. It
  //   should probably disconnect the client, so that they can reconnect and start over.
  constructor(getLimiterStub, reportError) {
    this.getLimiterStub = getLimiterStub;
    this.reportError = reportError;

    // Call the callback to get the initial stub.
    this.limiter = getLimiterStub();

    // When `inCooldown` is true, the rate limit is currently applied and checkLimit() will return
    // false.
    this.inCooldown = false;
  }

  // Call checkLimit() when a message is received to decide if it should be blocked due to the
  // rate limit. Returns `true` if the message should be accepted, `false` to reject.
  checkLimit() {
    if (this.inCooldown) {
      return false;
    }
    this.inCooldown = true;
    this.callLimiter();
    return true;
  }

  // callLimiter() is an internal method which talks to the rate limiter.
  async callLimiter() {
    try {
      let response;
      try {
        // Currently, fetch() needs a valid URL even though it's not actually going to the
        // internet. We may loosen this in the future to accept an arbitrary string. But for now,
        // we have to provide a dummy URL that will be ignored at the other end anyway.
        response = await this.limiter.fetch("https://dummy-url", {method: "POST"});
      } catch (err) {
        // `fetch()` threw an exception. This is probably because the limiter has been
        // disconnected. Stubs implement E-order semantics, meaning that calls to the same stub
        // are delivered to the remote object in order, until the stub becomes disconnected, after
        // which point all further calls fail. This guarantee makes a lot of complex interaction
        // patterns easier, but it means we must be prepared for the occasional disconnect, as
        // networks are inherently unreliable.
        //
        // Anyway, get a new limiter and try again. If it fails again, something else is probably
        // wrong.
        this.limiter = this.getLimiterStub();
        response = await this.limiter.fetch("https://dummy-url", {method: "POST"});
      }

      // The response indicates how long we want to pause before accepting more requests.
      let cooldown = +(await response.text());
      await new Promise(resolve => setTimeout(resolve, cooldown * 1000));

      // Done waiting.
      this.inCooldown = false;
    } catch (err) {
      this.reportError(err);
    }
  }
}
