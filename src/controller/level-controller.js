import { Router } from "express";

import { checkAnswers, getLevel } from "../service/content.js";
import { getStoredLevel } from "../service/control-db.js";

const levelController = Router();

levelController.get("/levels/:id", async (req, res) => {
  if (/^\d+$/.test(req.params.id)) {
    try {
      const level = await getStoredLevel(req.params.id);
      if (!level) return res.status(404).json({ message: "Nível não encontrado." });
      return res.status(200).json(level);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro interno da API." });
    }
  }

  const level = getLevel(req.params.id);
  if (!level) return res.status(404).json({ message: "Fase não encontrada." });
  return res.status(200).json(level);
});

levelController.post("/levels/:id/check", (req, res) => {
  const level = getLevel(req.params.id);
  if (!level) return res.status(404).json({ message: "Fase não encontrada." });
  return res.status(200).json({ check: checkAnswers(level, req.body?.inputs) });
});

export default levelController;
