import { Router } from "express";

import {
  ApiError,
  completeGameSession,
  executeLevelQuery,
  getGameSession,
  listSessionQueries,
  getSessionProgress,
  startGameSession,
  useLevelHint,
} from "../service/game-sessions.js";

const sessionsController = Router();

function sendError(res, error) {
  console.error(error);
  const status = error instanceof ApiError ? error.status : 500;
  return res.status(status).json({ message: error.message ?? "Erro interno da API." });
}

sessionsController.post("/game-sessions", async (req, res) => {
  try {
    return res.status(201).json(await startGameSession(req.body ?? {}));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/:sessionId", async (req, res) => {
  try {
    const session = await getGameSession(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Sessão não encontrada." });
    return res.status(200).json(session);
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/:sessionId/progress", async (req, res) => {
  try {
    return res.status(200).json(await getSessionProgress(req.params.sessionId));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/:sessionId/sql-queries", async (req, res) => {
  try {
    return res.status(200).json(await listSessionQueries(req.params.sessionId));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:sessionId/levels/:levelId/query", async (req, res) => {
  try {
    const outcome = await executeLevelQuery(req.params.sessionId, req.params.levelId, req.body?.query);
    return res.status(outcome.error ? 400 : 200).json(outcome);
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:sessionId/levels/:levelId/hints/:hintId/use", async (req, res) => {
  try {
    return res.status(200).json(await useLevelHint(req.params.sessionId, req.params.levelId, req.params.hintId));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:sessionId/complete", async (req, res) => {
  try {
    return res.status(200).json(await completeGameSession(req.params.sessionId));
  } catch (error) {
    return sendError(res, error);
  }
});

export default sessionsController;
