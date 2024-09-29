import { Router } from "express";
import { findById } from "../service/firestore.js";

const gameController = Router();

gameController.get("/games/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const game = await findById("games", id);
    res.status(200).json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sever error." });
  }
});

export default gameController;
