import { Router } from "express";
import { create, findById } from "../service/firestore.js";

const gameController = Router();

gameController.get("/games/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const game = await findById("games", id);
    res.status(200).json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

gameController.post("/games/play", async (req, res) => {
  try {
    const {
      username, score, level, currentLevel,
      startTime, endTime, won, errors, helps
    } = req.body;
    const id = await create("plays", {
      username, score, level, currentLevel,
      startTime, endTime, won, errors, helps
    });
    res.status(200).json({ play: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

export default gameController;
