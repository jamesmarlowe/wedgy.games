// import sessionMiddleware from "./session";
// import staticApp from "./static";

const compression = require("compression");
// const vhost = require("vhost");
const favicon = require("serve-favicon");
const path = require("path");
const express = require("express");

const app = express();
app.use(compression());
app.use(favicon(path.join(__dirname, "/dist", "favicon.ico")));
app.use(
  "/static",
  express.static(path.join(__dirname, "/dist"), { maxAge: "10d" })
);
// app.use(vhost("assets*", staticApp));
// app.use(sessionMiddleware);
app.get("/host", (_, response) => {
  response.sendFile(path.join(__dirname, "/dist/host.html"));
});

app.get("/", (_, response) => {
  response.sendFile(path.join(__dirname, "/dist/player.html"));
});

app.get("/google335c98d47f9db290.html", (_, response) => {
  response.sendFile(path.join(__dirname, "/dist/google335c98d47f9db290.html"));
});

app.get("*");

export default app;
