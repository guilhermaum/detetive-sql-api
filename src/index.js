import express from "express";
import './firebase/config.js';
import "./sql/db.js";
import sqlController from "./controller/sql-controller.js";

const server = express();

server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.use(sqlController);

server.listen(3000, _ => {
  console.log("Server running.");
});
