import express from "express";
import cors from "cors";

import './firebase/config.js';
import "./sql/db.js";

import sqlController from "./controller/sql-controller.js";
import gameController from "./controller/game-controller.js";

const server = express();

server.use(cors({ origin: "*" }))
server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.use(sqlController);
server.use(gameController);

server.listen(3000, _ => {
  console.log("Server running.");
});