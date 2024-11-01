const express = require("express");
const compression = require("compression");
const path = require("path");

const app = express();

app.use(compression());

app.use("/", express.static(path.join(__dirname, "/dist"), { maxAge: "10d" }));

export default app;
