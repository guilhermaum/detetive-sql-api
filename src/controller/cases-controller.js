import { Router } from "express";

import {
  createCase,
  createLevel,
  deleteCase,
  deleteLevel,
  getCase,
  listCases,
  listLevels,
  updateCase,
  updateLevel,
} from "../service/control-db.js";

const casesController = Router();

function sendError(res, error) {
  console.error(error);
  return res.status(error.status ?? 500).json({ message: error.message ?? "Erro interno da API." });
}

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

casesController.get("/cases", async (req, res) => {
  try {
    return res.status(200).json(await listCases(req.query.difficulty));
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.get("/cases/:caseId", async (req, res) => {
  try {
    const id = validId(req.params.caseId);
    const item = id ? await getCase(id) : null;
    if (!item) return res.status(404).json({ message: "Caso não encontrado." });
    return res.status(200).json(item);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.post("/cases", async (req, res) => {
  try {
    const name = req.body?.name ?? req.body?.nome;
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "O campo 'name' é obrigatório." });
    }
    const item = await createCase({ ...req.body, name: name.trim() });
    return res.status(201).json(item);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.put("/cases/:caseId", async (req, res) => {
  try {
    const id = validId(req.params.caseId);
    if (!id) return res.status(404).json({ message: "Caso não encontrado." });
    const item = await updateCase(id, req.body ?? {});
    if (!item) return res.status(404).json({ message: "Caso não encontrado." });
    return res.status(200).json(item);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.delete("/cases/:caseId", async (req, res) => {
  try {
    const id = validId(req.params.caseId);
    if (!id || !(await deleteCase(id))) {
      return res.status(404).json({ message: "Caso não encontrado." });
    }
    return res.status(200).json({ message: "Caso removido." });
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.get("/cases/:caseId/levels", async (req, res) => {
  try {
    const id = validId(req.params.caseId);
    const levels = id ? await listLevels(id) : null;
    if (levels === null) return res.status(404).json({ message: "Caso não encontrado." });
    return res.status(200).json(levels);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.post("/cases/:caseId/levels", async (req, res) => {
  try {
    const id = validId(req.params.caseId);
    if (!id) return res.status(404).json({ message: "Caso não encontrado." });
    const level = await createLevel(id, req.body ?? {});
    if (!level) return res.status(404).json({ message: "Caso não encontrado." });
    return res.status(201).json(level);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.put("/levels/:levelId", async (req, res) => {
  try {
    const id = validId(req.params.levelId);
    if (!id) return res.status(404).json({ message: "Nível não encontrado." });
    const level = await updateLevel(id, req.body ?? {});
    if (!level) return res.status(404).json({ message: "Nível não encontrado." });
    return res.status(200).json(level);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.delete("/levels/:levelId", async (req, res) => {
  try {
    const id = validId(req.params.levelId);
    if (!id || !(await deleteLevel(id))) {
      return res.status(404).json({ message: "Nível não encontrado." });
    }
    return res.status(200).json({ message: "Nível removido." });
  } catch (error) {
    return sendError(res, error);
  }
});

export default casesController;
