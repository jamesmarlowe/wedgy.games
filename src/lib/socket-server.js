import http from "http";
import socketIO from "socket.io";
import crypto from "crypto";
import * as R from "ramda";
import { shuffle, mode } from "./utils";
import { THEMED_WORDS } from "./words";
import { wordfind } from "./wordfind";
import app from "./app";
import { pickPlayer, colors } from "./avatars";
import { PORT, EVENTS, THEME_OPTIONS, WORDS_PER_ROUND } from "./constants";

const server = http.Server(app);
const io = socketIO(server);

const rooms = {};
const sockets = {};

const sendThemes = (roomCode) => {
  const themes = shuffle(
    R.without(rooms[roomCode].usedThemes, Object.keys(THEMED_WORDS))
  ).slice(0, THEME_OPTIONS);
  rooms[roomCode].voteOptions = themes;
  io.to(roomCode).emit(EVENTS.PRE_ROUND, themes);
};

const resetRoom = (roomCode) => {
  rooms[roomCode].usedThemes = [];
  rooms[roomCode].usedWords = [];
  rooms[roomCode].voteOptions = [];
  rooms[roomCode].round = 0;
  rooms[roomCode].availableWords = [];
  rooms[roomCode].voting = false;
  rooms[roomCode].players = rooms[roomCode].players.map((p) => ({
    ...p,
    rounds: 0,
    words: 0,
  }));
  R.map((p) => {
    io.to(roomCode).emit(EVENTS.CHANGE_SCORE, p);
  }, rooms[roomCode].players);
};

io.on("connection", (socket) => {
  socket.on(EVENTS.DISCONNECT, () => {
    const roomCode = sockets[socket.id];
    if (rooms[roomCode]) {
      delete sockets[socket.id];
      rooms[roomCode].players = rooms[roomCode].players.filter(
        (item) => item.id !== socket.id
      );
      io.to(roomCode).emit(EVENTS.DISCONNECT_PLAYER, socket.id);
      if (rooms[roomCode].players.length === 0) {
        delete rooms[roomCode];
      }
    }
  });
  socket.on(EVENTS.NEW_ROOM, (function_) => {
    const roomCode = crypto.randomBytes(2).toString("hex");
    const player = {
      ...pickPlayer([]),
      id: socket.id,
      rounds: 0,
      words: 0,
    };
    rooms[roomCode] = {
      players: [player],
      round: 0,
      usedThemes: [],
      usedWords: [],
      voting: false,
    };
    sockets[socket.id] = roomCode;
    socket.join(roomCode);
    io.to(socket.id).emit(EVENTS.NEW_PLAYER, { ...player, you: true });
    function_(roomCode);
  });
  socket.on(EVENTS.NEW_PLAYER, (roomCode, function_) => {
    if (
      rooms[roomCode] &&
      rooms[roomCode].players.length < colors.length &&
      !sockets[socket.id]
    ) {
      sockets[socket.id] = roomCode;
      const player = {
        ...pickPlayer(rooms[roomCode].players),
        id: socket.id,
        rounds: 0,
        words: 0,
      };
      rooms[roomCode].players = rooms[roomCode].players.concat(player);
      io.to(roomCode).emit(EVENTS.NEW_PLAYER, player);
      for (let index = 0; index < rooms[roomCode].players.length; index++) {
        // console.log(rooms[roomCode].players[index].avatar);
        const cplayer = rooms[roomCode].players[index];
        io.to(socket.id).emit(EVENTS.NEW_PLAYER, {
          ...cplayer,
          you: socket.id === cplayer.id,
        });
        io.to(socket.id).emit(EVENTS.CHANGE_SCORE, cplayer);
      }
      socket.join(roomCode);
      function_();
      // io.to(socket.id).emit("message", "correct roomcode");
    } else {
      io.to(socket.id).emit(EVENTS.WRONG_ROOM);
    }
  });
  socket.on(EVENTS.EVERYONE_JOINED, () => {
    const roomCode = [...socket.rooms][1];
    if (!rooms[roomCode].voting) {
      rooms[roomCode].voting = true;
      console.log("everyone joined server", roomCode);
      sendThemes(roomCode);
    }
  });
  socket.on(EVENTS.FOUND_WORD, (word, start, end) => {
    // console.log("server found word", word, start, end);
    // console.log([...socket.rooms]);
    const roomCode = [...socket.rooms][1];
    if (roomCode && rooms[roomCode].availableWords.includes(word)) {
      rooms[roomCode].availableWords = R.without(
        [word],
        rooms[roomCode].availableWords
      );
      const player = rooms[roomCode].players.filter(
        (item) => item.id === socket.id
      )[0];
      player.words += 1;
      io.to(roomCode).emit(EVENTS.FOUND_WORD, word, start, end, player);
      io.to(roomCode).emit(EVENTS.CHANGE_SCORE, player);
      console.log(rooms[roomCode].availableWords.length);
      if (rooms[roomCode].availableWords.length === 0) {
        const max = Math.max(...R.pluck("words", rooms[roomCode].players));
        const winners = rooms[roomCode].players.filter(
          (item) => item.words === max
        );
        if (winners.length > 1) {
          const theme =
            rooms[roomCode].usedThemes[rooms[roomCode].usedThemes.length - 1];
          const words = R.without(
            rooms[roomCode].usedWords,
            shuffle(THEMED_WORDS[theme])
          ).slice(-1);
          const puzzle = wordfind.newPuzzleLax(words, {
            height: 13,
            width: 13,
            maxGridGrowth: 0,
            maxAttempts: 10,
            preferOverlap: true,
          });
          rooms[roomCode].availableWords = words;
          io.to(roomCode).emit(
            EVENTS.POST_ROUND,
            theme,
            words,
            puzzle,
            rooms[roomCode].round
          );
        } else {
          rooms[roomCode].round += 1;
          R.map((p) => {
            p.rounds += 1;
          }, winners);
          // R.map(
          //   (p) => {
          //     p.rounds += p.words / 5;
          //   },
          //   rooms[roomCode].players.filter((item) => item.words !== max)
          // );
          R.map((p) => {
            p.words = 0;
            io.to(roomCode).emit(EVENTS.CHANGE_SCORE, p);
          }, rooms[roomCode].players);
          const maxRound = Math.max(
            ...R.pluck("rounds", rooms[roomCode].players)
          );
          if (maxRound < 3) {
            sendThemes(roomCode);
          } else {
            io.to(roomCode).emit(
              EVENTS.GAME_OVER,
              rooms[roomCode].players.filter((item) => item.rounds >= 3)[0]
            );
            resetRoom(roomCode);
          }
        }
      }
    }
  });
  socket.on(EVENTS.VOTE, (selection) => {
    const roomCode = [...socket.rooms][1];
    if (roomCode && rooms[roomCode].voteOptions.includes(selection)) {
      const player = rooms[roomCode].players.filter(
        (p) => p.id === socket.id
      )[0];
      player.vote = selection;
      io.to(roomCode).emit(EVENTS.VOTE, player, selection);

      if (rooms[roomCode].players.every((p) => p.vote)) {
        io.to(roomCode).emit(EVENTS.VOTE_OVER);
        rooms[roomCode].voting = false;
        const theme = mode(R.pluck("vote", rooms[roomCode].players));
        rooms[roomCode].players.forEach((p) => delete p.vote); // eslint-disable-line unicorn/no-array-for-each
        rooms[roomCode].usedThemes.push(theme);
        const words = shuffle(THEMED_WORDS[theme]).slice(
          -WORDS_PER_ROUND[rooms[roomCode].players.length]
        );
        const puzzle = wordfind.newPuzzleLax(words, {
          height: 13,
          width: 13,
          maxGridGrowth: 0,
          maxAttempts: 10,
          preferOverlap: true,
        });
        rooms[roomCode].availableWords = words;
        rooms[roomCode].usedWords = words;
        console.log("sending words", words);
        io.to(roomCode).emit(
          EVENTS.NEW_GAME,
          theme,
          words,
          puzzle,
          rooms[roomCode].round
        );
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Starting server on port ${PORT}`);
});
