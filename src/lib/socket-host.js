import io from "socket.io-client";
import { EVENTS } from "./constants";

const socket = io(window.location.origin);
export const getRoom = (function_) => socket.emit(EVENTS.NEW_ROOM, function_);

export const playerAdd = (function_) => socket.on(EVENTS.NEW_PLAYER, function_);

export const newGame = (function_) => socket.on(EVENTS.NEW_GAME, function_);

export const foundWord = (function_) => socket.on(EVENTS.FOUND_WORD, function_);

export const countDownStart = (function_) =>
  socket.on("countdown start", function_);

socket.on("message", (d) => console.log("h1", d));
