import { Router } from "express";
import { create, findAll, findWithFilters } from "../service/firestore.js";

const playerController = Router();

playerController.post("/players", async (req, res) => {
  try {
    const {
      username, score, level, currentLevel,
      startTime, endTime, won, errors, helps
    } = req.body;
    const id = await create("players", {
      username, score, level, currentLevel,
      startTime, endTime, won, errors, helps
    });
    res.status(200).json({ play: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

playerController.get("/players", async (req, res) => {
  try {
    const players = await findAll("players");
    res.status(200).json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

playerController.get("/players/ranking", async (req, res) => {
  try {
    const fielters = [{ fd: "complete", op: "==", vl: true }]
    const order = { field: "score", direction: "desc" }
    const players = await findWithFilters("players", fielters, order);
    res.status(200).json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

export default playerController;
