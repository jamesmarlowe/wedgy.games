import io from "socket.io-client";
import { EVENTS } from "./constants";

const socket = io(window.location.origin);
export const sendMessage = (roomCode, message) => socket.emit(message);

export const getRoom = (function_) => socket.emit(EVENTS.NEW_ROOM, function_);

export const sendEveryoneJoined = () => {
  console.log("sending everyone joined");
  socket.emit(EVENTS.EVERYONE_JOINED);
};

export const connect = (roomCode, function_) => {
  socket.emit(EVENTS.NEW_PLAYER, roomCode, function_);
};

export const sendFoundWord = (word, start, end) => {
  socket.emit(EVENTS.FOUND_WORD, word, start, end);
};

export const sendVote = (selection) => {
  socket.emit(EVENTS.VOTE, selection);
};

export const disconnected = (function_) =>
  socket.on(EVENTS.DISCONNECT, function_);

export const gameOver = (function_) => socket.on(EVENTS.GAME_OVER, function_);

export const voteOver = (function_) => socket.on(EVENTS.VOTE_OVER, function_);

export const preRound = (function_) => socket.on(EVENTS.PRE_ROUND, function_);

export const postRound = (function_) => socket.on(EVENTS.POST_ROUND, function_);

export const wrongRoom = (function_) => socket.on(EVENTS.WRONG_ROOM, function_);

export const recieveVote = (function_) => socket.on(EVENTS.VOTE, function_);

export const recieveWordFound = (function_) =>
  socket.on(EVENTS.FOUND_WORD, function_);

export const recieveChangeScore = (function_) =>
  socket.on(EVENTS.CHANGE_SCORE, function_);

export const playerRemove = (function_) =>
  socket.on(EVENTS.DISCONNECT_PLAYER, function_);

export const playerAdd = (function_) => socket.on(EVENTS.NEW_PLAYER, function_);

export const newGame = (function_) => socket.on(EVENTS.NEW_GAME, function_);

// export const joinLobby = (function_) => socket.on(EVENTS.JOIN_LOBBY, function_);

export const countDownStart = (function_) =>
  socket.on("countdown start", function_);

socket.on("message", (d) => console.log("p1", d));
