import 'dotenv/config';
import './firebase/config.js';
import "./sql/config.js";

import express from "express";
import cors from "cors";

import sqlController from "./controller/sql-controller.js";
import gameController from "./controller/game-controller.js";
import levelController from "./controller/level-controller.js";

const server = express();

server.use(cors({ origin: "*" }))
server.use(express.urlencoded({ extended: true }));
server.use(express.json());

server.use(sqlController);
server.use(gameController);
server.use(levelController);

const port = process.env.PORT || 3000;
server.listen(port, _ => {
  console.log("Server running.");
});