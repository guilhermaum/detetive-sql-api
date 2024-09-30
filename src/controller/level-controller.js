import { Router } from "express";
import { checkAnswers, create, findById } from "../service/firestore.js";
import blocker from "../middleware/blocker.js";

const levelController = Router();
 
levelController.post("/levels", blocker, async (req, res) => {
  try {
    const { number, tips, problems, template } =
      req.body;
    const data = { number, tips, problems, template };
    const id = await create("levels", data);
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

levelController.get("/levels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const level = await findById("levels", id);
    res.status(200).json(level);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

levelController.post("/levels/:id/check", async (req, res) => {
  try {
    const { id } = req.params;
    const { inputs } = req.body;
    const check = await checkAnswers("levels", id, inputs);
    res.status(200).json({ check });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
});

export default levelController;
