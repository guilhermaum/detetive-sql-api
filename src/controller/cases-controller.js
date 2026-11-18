import { Router } from "express";

import {
  createCase,
  createLevel,
  deleteCase,
  deleteLevel,
  getCase,
  getCaseImage,
  listCases,
  listLevels,
  updateCase,
  updateLevel,
} from "../service/control-db.js";
import { selectCaseForPlayer } from "../service/game-sessions.js";
import { parseMultipartForm } from "../service/multipart.js";

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

casesController.post("/cards/:cardId/cases/select", async (req, res) => {
  try {
    return res.status(200).json(await selectCaseForPlayer({
      ...(req.body ?? {}),
      card_id: req.params.cardId,
    }));
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

casesController.get("/cases/:caseId/database-image", async (req, res) => {
  try {
    const id = validId(req.params.caseId);
    const image = id ? await getCaseImage(id) : null;
    if (!image) return res.status(404).json({ message: "Database image not found." });
    return res
      .status(200)
      .set("Content-Type", image.contentType)
      .set("X-Content-Type-Options", "nosniff")
      .send(image.bytes);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.post("/cases", async (req, res) => {
  try {
    const { fields, files } = await parseMultipartForm(req);
    const file = files.database_file;
    const image = files.database_image;
    if (!file) return res.status(400).json({ message: "O arquivo .sql no campo 'database_file' é obrigatório." });
    if (!/\.sql$/i.test(file.filename)) {
      return res.status(400).json({ message: "O campo 'database_file' deve conter um arquivo .sql." });
    }

    const name = fields.name ?? fields.nome;
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "O campo 'name' é obrigatório." });
    }

    let levels;
    if (fields.levels !== undefined) {
      try {
        levels = JSON.parse(fields.levels);
      } catch {
        return res.status(400).json({ message: "O campo 'levels' deve conter um JSON válido." });
      }
      if (!Array.isArray(levels)) {
        return res.status(400).json({ message: "O campo 'levels' deve ser uma lista JSON." });
      }
    }

    const item = await createCase({
      name: name.trim(),
      description: fields.description ?? "",
      difficulty: fields.difficulty ?? "medium",
      levels,
      database_file: file.data,
      ...(image ? { database_image: image.data, database_image_filename: image.filename } : {}),
    });
    return res.status(201).json(item);
  } catch (error) {
    return sendError(res, error);
  }
});

casesController.put("/cases/:caseId", async (req, res) => {
  try {
    const id = validId(req.params.caseId);
    if (!id) return res.status(404).json({ message: "Caso não encontrado." });
    let fields = req.body ?? {};
    let files = {};
    if (/^multipart\/form-data\b/i.test(req.headers["content-type"] ?? "")) {
      ({ fields, files } = await parseMultipartForm(req));
    }
    if (files.database_file && !/\.sql$/i.test(files.database_file.filename)) {
      return res.status(400).json({ message: "O campo 'database_file' deve conter um arquivo .sql." });
    }
    const item = await updateCase(id, {
      ...fields,
      ...(files.database_file ? { database_file: files.database_file.data } : {}),
      ...(files.database_image ? {
        database_image: files.database_image.data,
        database_image_filename: files.database_image.filename,
      } : {}),
    });
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
