import toggleFullScreen from "./lib/fullscreen";
import { EVENTS } from "./lib/constants";
import { hexColors } from "./lib/avatars";
import { setupHighlights, highlight } from "./lib/highlights";

let currentWebSocket = null;

let roster = document.querySelector("#left-players");
let currentWord, currentStart, currentEnd;
const player = {};
let roomname;
const containerDiv = "#container";
let hostname = window.location.host;
if (hostname == "") {
  // Probably testing the HTML locally.
  hostname = "intro.wedgy.games";
}

// function startNameChooser() {
//   nameForm.addEventListener("submit", event => {
//     event.preventDefault();
//     username = nameInput.value;
//     if (username.length > 0) {
//       startRoomChooser();
//     }
//   });

//   nameInput.addEventListener("input", event => {
//     if (event.currentTarget.value.length > 32) {
//       event.currentTarget.value = event.currentTarget.value.slice(0, 32);
//     }
//   });

//   nameInput.focus();
// }

// function startRoomChooser() {
//   nameForm.remove();

//   if (document.location.hash.length > 1) {
//     roomname = document.location.hash.slice(1);
//     startChat();
//     return;
//   }

//   roomForm.addEventListener("submit", event => {
//     event.preventDefault();
//     roomname = roomNameInput.value;
//     if (roomname.length > 0) {
//       startChat();
//     }
//   });

//   roomNameInput.addEventListener("input", event => {
//     if (event.currentTarget.value.length > 32) {
//       event.currentTarget.value = event.currentTarget.value.slice(0, 32);
//     }
//   });

//   goPublicButton.addEventListener("click", event => {
//     roomname = roomNameInput.value;
//     if (roomname.length > 0) {
//       startChat();
//     }
//   });

//   goPrivateButton.addEventListener("click", async event => {
//     roomNameInput.disabled = true;
//     goPublicButton.disabled = true;
//     event.currentTarget.disabled = true;

//     let response = await fetch("https://" + hostname + "/api/room", {method: "POST"});
//     if (!response.ok) {
//       alert("something went wrong");
//       document.location.reload();
//       return;
//     }

//     roomname = await response.text();
//     startChat();
//   });

//   roomNameInput.focus();
// }

// function startChat() {
//   roomForm.remove();

//   // Normalize the room name a bit.
//   roomname = roomname.replace(/[^a-zA-Z0-9_-]/g, "").replace(/_/g, "-").toLowerCase();

//   if (roomname.length > 32 && !roomname.match(/^[0-9a-f]{64}$/)) {
//     addChatMessage("ERROR", "Invalid room name.");
//     return;
//   }

//   document.location.hash = "#" + roomname;


//   chatroom.addEventListener("submit", event => {
//     event.preventDefault();

//     if (currentWebSocket) {
//       currentWebSocket.send(JSON.stringify({message: chatInput.value}));
//       chatInput.value = "";

//       // Scroll to bottom whenever sending a message.
//       chatlog.scrollBy(0, 1e8);
//     }
//   });

//   chatInput.addEventListener("input", event => {
//     if (event.currentTarget.value.length > 256) {
//       event.currentTarget.value = event.currentTarget.value.slice(0, 256);
//     }
//   });

//   chatlog.addEventListener("scroll", event => {
//     isAtBottom = chatlog.scrollTop + chatlog.clientHeight >= chatlog.scrollHeight;
//   });

//   chatInput.focus();
//   document.body.addEventListener("click", event => {
//     // If the user clicked somewhere in the window without selecting any text, focus the chat
//     // input.
//     if (window.getSelection().toString() == "") {
//       chatInput.focus();
//     }
//   });

//   // Detect mobile keyboard appearing and disappearing, and adjust the scroll as appropriate.
//   if('visualViewport' in window) {
//     window.visualViewport.addEventListener('resize', function(event) {
//       if (isAtBottom) {
//         chatlog.scrollBy(0, 1e8);
//       }
//     });
//   }

//   join();
// }

let lastSeenTimestamp = 0;

function join() {
    console.log("join called")
  // If we are running via wrangler dev, use ws:
  const wss = document.location.protocol === "http:" ? "ws://" : "wss://";
  let ws = new WebSocket(wss + hostname + "/api/room/" + roomname + "/websocket");
  let rejoined = false;
  let startTime = Date.now();

  let rejoin = async () => {
    if (!rejoined) {

    console.log("rejoin")
      rejoined = true;
      currentWebSocket = null;

      // Clear the roster.
      while (roster.firstChild) {
        roster.removeChild(roster.firstChild);
      }

      // Don't try to reconnect too rapidly.
      let timeSinceLastJoin = Date.now() - startTime;
      if (timeSinceLastJoin < 10000) {
        // Less than 10 seconds elapsed since last join. Pause a bit.
        await new Promise(resolve => setTimeout(resolve, 10000 - timeSinceLastJoin));
      }

      // OK, reconnect now!
      join();
    }
  }

  ws.addEventListener("open", event => {
    console.log("websocket open")
    currentWebSocket = ws;

    // Send user info message.
    ws.send(JSON.stringify({new: true}));
  });

  ws.addEventListener("message", event => {
    console.log("websocket message", event)
    let data = JSON.parse(event.data);
    console.log(data)
    if (data.error) {
      console.log("* Error: " + data.error);
    } else if (data.joined) {
        console.log(data.joined)
      let p = document.createElement("div");
      p.id = `id-${data.joined}`;
      p.classList.add("player");
      p.innerHTML = `<div class="badge"></div><img src="./static/compressed/${data.joined}.svg" /><span class="dot dot1"></span><span class="dot dot2"></span><span class="dot dot3"></span>`
      
      console.log(p)
      roster.appendChild(p);
      console.log(roster)
    } else if (data.quit) {
      for (let child of roster.childNodes) {
        if (child.id == `id-${data.quit}`) {
          roster.removeChild(child);
          break;
        }
      }
    } else if (data.ready) {
      // All pre-join messages have been delivered.
      if (data.you){
        player.avatar = data.you
        player.color = data.color
        document.getElementById(`id-${data.you}`).classList.add("you");
      }
    }
    switch (data.event) {
        case EVENTS.PRE_ROUND:
            showOptions(data.themes);
            break;
        case EVENTS.VOTE:
            updateVote(data.player, data.selection);
            break;
        case EVENTS.VOTE_OVER:
            removeOptions();
            break;
        case EVENTS.NEW_GAME:
            voteTransition(data.theme, data.words, data.puzzle, data.round);
            break;
        case EVENTS.FOUND_WORD:
            getFoundWord(data.word, data.start, data.end, data.player)
            break;
        case EVENTS.CHANGE_SCORE:
            changeScore(data.player)
            break;
        case EVENTS.POST_ROUND:
            tieTransition(data.theme, data.words, data.puzzle, data.round);
            break;
        case EVENTS.GAME_OVER:
            showGameOver(data.session.name)
            break;
        default:
          return;
    }
  });

  ws.addEventListener("close", event => {
    console.log("WebSocket closed, reconnecting:", event.code, event.reason);
    rejoin();
  });
  ws.addEventListener("error", event => {
    console.log("WebSocket error, reconnecting:", event);
    rejoin();
  });
}

document
  .querySelector("#wordsearch-fullscreen")
  .addEventListener("click", toggleFullScreen);

const showMenu = () => {
    document.querySelector("#container").innerHTML += `
        <form id="join-form" action="/fake-form-action">
          <button id="createButton">CREATE</button>
          <button id="showJoinButton">JOIN</button>
        </form>`;
    document.querySelector("#createButton").addEventListener("click", autoroomname);
    document.querySelector("#showJoinButton").addEventListener("click", showJoin);
  };

const showJoin = () => {
    document.querySelector("#join-form").innerHTML = `
        <label for="room" class="text-signin">ROOM CODE</label>
        <input name="room" id="roomname" class="form-control" type="text" tabindex="0" placeholder="CODE" style="text-transform:uppercase;" maxlength="4" value="" autocapitalize="off" autocorrect="off" autocomplete="off">
        <button id="joinButton">JOIN</button>
    `;
    document.querySelector("#roomname").focus();
    document.querySelector("#joinButton").addEventListener("click", manualroomname);
};

const manualroomname = (event) => {
    event.preventDefault();
    setCode(document.querySelector("#roomname").value)
    location.reload();
}

const autoroomname = async (event) => {
    event.preventDefault();
    let response = await fetch("https://" + hostname + "/api/room", {method: "POST"});
    if (!response.ok) {
      alert("something went wrong");
      document.location.reload();
      return;
    }
    setCode(await response.text());
    location.reload();
}

const startLobby = () => {
    const joinForm = document.querySelector("#join-form");
    if (joinForm) joinForm.remove();
    document
      .querySelector(containerDiv)
      .classList.add("playing", "joining", "game");
    document.querySelector(
      "#wordsearch-right"
    ).innerHTML += `<button id="startButton">START</button><button id="backButton">BACK</button>`;
    document
      .querySelector("#startButton")
      .addEventListener("click", everyoneJoined);
    document.querySelector("#backButton").addEventListener("click", stopLobby);
    join()
  };

const stopLobby = () => {
    window.location.href = "/";
    // document
    //   .querySelector(containerDiv)
    //   .classList.remove("playing", "joining", "game");
  };

const tieTransition = (...arguments_) => {
    document.querySelector(
      containerDiv
    ).innerHTML += `<div id="winner"><h1>No winner yet...</h1></div>`;
    setTimeout(() => {
      startGame(false)(...arguments_);
    }, 3000);
  };

const updateVote = (nplayer, selection) => {
    console.log("updateVote", nplayer, selection)
    const voter = document.querySelector(`#id-${nplayer}`)
    console.log("updateVote", voter)
    voter.classList.add("voted");
    if (voter.classList.contains("you")) {
      const buttons = document.querySelectorAll("button.voted");
      // console.log(buttons);
      if (buttons.length > 0) buttons.forEach((b) => b.classList.remove("voted")); // eslint-disable-line unicorn/no-array-for-each
      document.querySelector(`#select-${selection}`).classList.add("voted");
    }
  };

const removeOptions = () => {
    document
      .querySelectorAll(".player")
      .forEach((p) => p.classList.remove("voted")); // eslint-disable-line unicorn/no-array-for-each
  };

const voteTransition = (...arguments_) => {
    document.querySelector(
      "#join-form"
    ).innerHTML = `<h5>The vote is: ${arguments_[0]}</h5>`;
    setTimeout(() => {
      startGame(true)(...arguments_);
    }, 3000);
  };

const sendFoundWord = (word, start, end) => {
    if (currentWord != word || currentStart != start || currentEnd != end){
        currentWebSocket.send(JSON.stringify({event: EVENTS.FOUND_WORD, word, start, end}));
        currentWord = word;
        currentStart = start;
        currentEnd = end
    }
  };

const getFoundWord = (word, start, end, nplayer) => {
    console.log("getFoundWord", word, start, end, nplayer)
    document.querySelector(`#${word}`).classList.add("found", nplayer.color);
    document.querySelector(
      `#${word}`
    ).innerHTML += `<div class="animal" style="background: url('/static/compressed/${nplayer.name}.svg') no-repeat;"></div>`;
    highlight(start, end, word, nplayer.color);
  };

const changeScore = ({name, rounds, color}) => {
    if (document.querySelector(`#id-${name}`)) {
      // if (rounds > 0) {
      for (let dot = 3; dot > 0; dot--) {
        document
          .querySelector(`#id-${name}`)
          .querySelector(
            `.dot${dot}`
          ).style = `background-image: linear-gradient(0, ${hexColors[color]} ${
          (rounds - (dot - 1)) * 100
        }%, transparent 0)`;
      }
    }
  };

const startGame = (clear) => (theme, words, puzzle, round) => {
    console.log(words);
    const winner = document.querySelector("#winner");
    if (winner) winner.remove();
    document.getElementById("round").innerHTML = `Round ${round + 1}`;
    document.getElementById("wordsearch-theme").innerHTML = theme;
    if (clear) {
      document.getElementById("wordsearch-words").innerHTML = words
        .map((w) => `<div class="s10" id="${w}">${w}</div>`)
        .join("");
    } else {
      document.getElementById("wordsearch-words").innerHTML += words
        .map((w) => `<div class="s10" id="${w}">${w}</div>`)
        .join("");
    }
    document.getElementById(
      "wordsearch-grid"
    ).innerHTML = `<div class="row"><div id="0-0" class="column grid-0-0">${puzzle
      .map((l, index) =>
        l
          .map((a, c) =>
            c < l.length
              ? `${a}</div><div id="${index}-${
                  c + 1
                }" class="column grid-${index}-${c + 1}">`
              : a
          )
          .join("")
      )
      .map((b, d) =>
        d < puzzle.length
          ? `${b}</div></div><div class="row"><div id="${
              d + 1
            }-0" class="column grid-${d + 1}-0">`
          : b
      )
      .join("")}</div></div>`;
    document
      .querySelector(containerDiv)
      .classList.add("playing", "joining", "game");
    const join = document.querySelector("#join-form");
    if (join) join.remove();
    setupHighlights(player.color, words, puzzle, sendFoundWord);
  };

const showGameOver = (name) => {
    // clearGame();
    document.querySelector(containerDiv).innerHTML += `<div id="winner">
    <img src="/static/compressed/${name}.svg" />
    <h1>${name.split("_")[1]} wins!</h1></div>`;
    startLobby();
  };

const everyoneJoined = () => {
    currentWebSocket.send(JSON.stringify({event: EVENTS.EVERYONE_JOINED}));
  };

const showOptions = (themes) => {
  const sb = document.getElementById("startButton");
  if (sb) sb.remove();
  const bb = document.getElementById("backButton");
  if (bb) bb.remove();
  console.log("show themes", themes);
  document.getElementById("wordsearch-center").innerHTML += `
      <form id="join-form" style="width:60%;top:100%">
        <span>Vote on a theme</span>
         ${themes
           .map(
             (w) =>
               `<button id="select-${w}"><div class="badge"></div>${w}</button>`
           )
           .join("")}
      </form>`;
  setTimeout(() => {
    document.querySelector("#join-form").style = "width:60%;";
  }, 100);
  themes.map((w) =>
    document.getElementById(`select-${w}`).addEventListener("click", vote(w))
  );
};

const vote = (selection) => (event) => {
    event.preventDefault();
    currentWebSocket.send(JSON.stringify({event: EVENTS.VOTE, selection}));
  };

const copyCode = () => {
    navigator.clipboard.writeText(window.location.href).then(
      function () {
        // toast.toast("copied to clipboard");
        console.log("Async: Copying to clipboard was successful!");
      },
      function (error) {
        console.error("Async: Could not copy text: ", error);
      }
    );
  };

const setCode = (roomCode) => {
    roomname = roomCode;
    window.history.pushState(
      "",
      `Search Party: room ${roomCode}`,
      `?room=${roomCode}`
    );
    document.querySelector(
      "#roomcode"
    ).innerHTML = `Room:<br/><span>${roomCode}</span>`;
    document.querySelector("#roomcode span").addEventListener("click", copyCode);
  };

const init = () => {
    const urlParameters = new URLSearchParams(window.location.search);
    if (urlParameters.has("room")) {
        setCode(urlParameters.get("room"));
        startLobby();
        return;
    } else {
        showMenu();
    }
}

init();