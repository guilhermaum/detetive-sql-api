import { Router } from "express";
import { findById } from "../service/firestore.js";

const gameController = Router();

gameController.get("/game/:id", async (req, res) => {
  const { id } = req.params;
  const game = await findById("games", id);
  res.status(200).json(game);
});

export default gameController;