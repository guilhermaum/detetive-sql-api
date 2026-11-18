import { Router } from "express";

import {
  ApiError,
  checkLevelAnswers,
  completeGameSession,
  executeLevelQuery,
  findResumableGameSession,
  getGameSession,
  listGameSessions,
  listSessionQueries,
  getSessionProgress,
  listSessionRanking,
  startGameSession,
  saveCurrentLevelScore,
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

sessionsController.get("/game-sessions", async (_req, res) => {
  try {
    return res.status(200).json(await listGameSessions());
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/resume", async (req, res) => {
  try {
    return res.status(200).json(await findResumableGameSession({
      card_id: req.query.card_id,
      player_id: req.query.player_id ?? req.query.user_id,
    }));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/card/:cardId/ranking", async (req, res) => {
  try {
    return res.status(200).json(await listSessionRanking(req.params.cardId, req.query.case_id));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/:gameSessionId", async (req, res) => {
  try {
    const session = await getGameSession(req.params.gameSessionId);
    if (!session) return res.status(404).json({ message: "Sessão não encontrada." });
    return res.status(200).json(session);
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/:gameSessionId/progress", async (req, res) => {
  try {
    return res.status(200).json(await getSessionProgress(req.params.gameSessionId));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.get("/game-sessions/:gameSessionId/sql-queries", async (req, res) => {
  try {
    return res.status(200).json(await listSessionQueries(req.params.gameSessionId));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:gameSessionId/levels/:levelId/query", async (req, res) => {
  try {
    const outcome = await executeLevelQuery(req.params.gameSessionId, req.params.levelId, req.body?.query);
    return res.status(outcome.error ? 400 : 200).json(outcome);
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:gameSessionId/levels/:levelId/check", async (req, res) => {
  try {
    return res.status(200).json(await checkLevelAnswers(
      req.params.gameSessionId,
      req.params.levelId,
      req.body?.answers,
      req.body?.score,
    ));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:gameSessionId/levels/:levelId/score", async (req, res) => {
  try {
    return res.status(200).json(await saveCurrentLevelScore(
      req.params.gameSessionId,
      req.params.levelId,
      req.body?.score,
    ));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:gameSessionId/levels/:levelId/hints/:hintId/use", async (req, res) => {
  try {
    return res.status(200).json(await useLevelHint(
      req.params.gameSessionId,
      req.params.levelId,
      req.params.hintId,
      req.body?.score,
    ));
  } catch (error) {
    return sendError(res, error);
  }
});

sessionsController.post("/game-sessions/:gameSessionId/complete", async (req, res) => {
  try {
    return res.status(200).json(await completeGameSession(req.params.gameSessionId));
  } catch (error) {
    return sendError(res, error);
  }
});

export default sessionsController;
