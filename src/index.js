import express from "express";
import cors from "cors";

import sqlController from "./controller/sql-controller.js";
import casesController from "./controller/cases-controller.js";
import gameController from "./controller/game-controller.js";
import levelController from "./controller/level-controller.js";
import sessionsController from "./controller/sessions-controller.js";
import "./sql/config.js";

const server = express();

server.use(cors());
server.options("*", cors());
server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

server.use(casesController);
server.use(sessionsController);
server.use(sqlController);
server.use(gameController);
server.use(levelController);

// Vercel imports the Express app as a serverless handler. Keep the listener
// for local development only.
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log("Server running.");
  });
}

export default server;
