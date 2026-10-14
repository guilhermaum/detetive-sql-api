import { Router } from "express";
import { getCases, getGame } from "../service/content.js";

const gameController = Router();

gameController.get("/games", (_req, res) => {
  return res.status(200).json(getCases());
});

gameController.get("/games/:id", (req, res) => {
  const game = getGame(req.params.id);
  if (!game) {
    return res.status(404).json({ message: "Jogo não encontrado." });
  }

  return res.status(200).json(game);
});

export default gameController;
