import { randomUUID } from "node:crypto";

import {
  getCase,
  getStoredLevel,
  readOneRow,
  readRows,
  toSession,
  withTransaction,
} from "./control-db.js";
import { checkAnswers } from "./content.js";
import { queryCaseDatabase } from "./sqlite.js";

const MAX_GAME_SCORE = 100;

export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function currentTime() {
  return new Date().toISOString();
}

export async function getGameSession(sessionId) {
  const sessionIdentifier = String(sessionId);
  const numericId = Number(sessionIdentifier);
  const session = Number.isSafeInteger(numericId) && numericId > 0
    ? await readOneRow("SELECT * FROM game_sessions WHERE id = ?", [numericId])
    : null;
  return toSession(session ?? await readOneRow("SELECT * FROM game_sessions WHERE session_id = ?", [sessionIdentifier]));
}

export async function listGameSessions() {
  const sessions = await readRows("SELECT * FROM game_sessions ORDER BY started_at DESC, id DESC");
  return sessions.map(toSession);
}

export async function startGameSession(input = {}) {
  const caseId = Number(input.case_id ?? input.caseId);
  if (!Number.isInteger(caseId) || caseId < 1) {
    throw new ApiError("O campo 'case_id' deve identificar um caso existente.");
  }

  const caseItem = await getCase(caseId);
  if (!caseItem) throw new ApiError("Caso não encontrado.", 404);

  const sessionId = randomUUID();
  const cardId = String(input.card_id ?? input.cardId ?? "").trim();
  const playerId = String(input.player_id ?? input.playerId ?? `test-player-${randomUUID()}`).trim();
  const playerName = String(input.player_name ?? input.playerName ?? playerId).trim();
  if (!cardId) throw new ApiError("O campo 'card_id' é obrigatório.");
  if (!playerId) throw new ApiError("O campo 'player_id' não pode ser vazio.");

  let gameSessionId;
  await withTransaction(({ one, run }) => {
    const firstLevel = one("SELECT id FROM levels WHERE case_id = ? ORDER BY number LIMIT 1", [caseId]);
    const startedAt = currentTime();
    const inserted = run(
      `INSERT INTO game_sessions(session_id, card_id, player_id, player_name, case_id,
         status, current_level, score, started_at)
       VALUES (?, ?, ?, ?, ?, 'in_progress', ?, 0, ?)`,
      [sessionId, cardId, playerId, playerName || playerId, caseId, firstLevel?.id ?? null, startedAt],
    );
    gameSessionId = Number(inserted.id);
    if (firstLevel) {
      run(
        `INSERT INTO player_progress(game_session_id, level_id, status, score, started_at)
         VALUES (?, ?, 'in_progress', ?, ?)`,
        [gameSessionId, firstLevel.id, MAX_GAME_SCORE, startedAt],
      );
    }
  });

  return getGameSession(gameSessionId);
}

export async function getSessionProgress(sessionId) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessão não encontrada.", 404);
  const progress = await readRows(
    `SELECT p.id, s.id AS game_session_id, p.level_id, p.status, p.score,
            p.started_at, p.finished_at AS completed_at
     FROM player_progress p
     JOIN game_sessions s ON s.id = p.game_session_id
     JOIN levels l ON l.id = p.level_id
     WHERE p.game_session_id = ? ORDER BY l.number`,
    [session.id],
  );
  const usedHintRows = await readRows(
    "SELECT level_id, hint_id FROM hint_usage WHERE game_session_id = ? ORDER BY used_at",
    [session.id],
  );
  const currentLevelUsedHints = usedHintRows
    .filter((row) => Number(row.level_id) === session.current_level_id)
    .map((row) => Number(row.hint_id));
  return {
    session,
    progress: progress.map((row) => ({
      ...row,
      id: Number(row.id),
      game_session_id: Number(row.game_session_id),
      level_id: Number(row.level_id),
      score: Number(row.score),
    })),
    used_hints: currentLevelUsedHints,
    used_hint_count: usedHintRows.length,
  };
}

function normalizeCaseDifficulty(value) {
  const difficulty = String(value ?? "").trim().toLowerCase();
  const aliases = new Map([
    ["facil", "easy"],
    ["easy", "easy"],
    ["medio", "medium"],
    ["medium", "medium"],
    ["dificil", "hard"],
    ["hard", "hard"],
  ]);
  const normalized = aliases.get(difficulty);
  if (!normalized) throw new ApiError("O campo difficulty deve ser facil, medio ou dificil.");
  return normalized;
}

export async function selectCaseForPlayer(input = {}) {
  const cardId = String(input.card_id ?? input.cardId ?? "").trim();
  const playerId = String(input.player_id ?? input.playerId ?? "").trim();
  const difficulty = normalizeCaseDifficulty(input.difficulty);
  const caseDistribution = String(input.case_distribution ?? input.caseDistribution ?? "aleatorio").trim().toLowerCase();
  if (!cardId) throw new ApiError("O campo card_id e obrigatorio.");
  if (!playerId) throw new ApiError("O campo player_id e obrigatorio.");
  if (caseDistribution !== "aleatorio" && caseDistribution !== "mesmo") {
    throw new ApiError("O campo case_distribution deve ser aleatorio ou mesmo.");
  }

  let selectedCaseId;
  await withTransaction(({ one, many, run }) => {
    const now = currentTime();
    let card = one("SELECT * FROM cards WHERE card_id = ?", [cardId]);

    if (!card) {
      run(
        `INSERT INTO cards(card_id, case_distribution, difficulty, case_id, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?)`,
        [cardId, caseDistribution, difficulty, now, now],
      );
      card = one("SELECT * FROM cards WHERE card_id = ?", [cardId]);
    } else if (card.case_distribution !== caseDistribution || card.difficulty !== difficulty) {
      run(
        `UPDATE cards SET case_distribution = ?, difficulty = ?, case_id = NULL, updated_at = ?
         WHERE card_id = ?`,
        [caseDistribution, difficulty, now, cardId],
      );
      card = one("SELECT * FROM cards WHERE card_id = ?", [cardId]);
    }

    if (caseDistribution === "mesmo") {
      if (card.case_id != null) {
        const existingCase = one(
          "SELECT id FROM cases WHERE id = ? AND lower(difficulty) = lower(?)",
          [card.case_id, difficulty],
        );
        if (existingCase) {
          selectedCaseId = Number(existingCase.id);
          return;
        }
      }

      const candidates = many(
        "SELECT id FROM cases WHERE lower(difficulty) = lower(?) ORDER BY id",
        [difficulty],
      );
      if (candidates.length === 0) {
        throw new ApiError("Nao ha casos cadastrados nesta dificuldade.", 404);
      }
      selectedCaseId = Number(candidates[Math.floor(Math.random() * candidates.length)].id);
      run("UPDATE cards SET case_id = ?, updated_at = ? WHERE card_id = ?", [selectedCaseId, now, cardId]);
      return;
    }

    const candidates = many(
      `SELECT c.id FROM cases c
       WHERE lower(c.difficulty) = lower(?)
         AND NOT EXISTS (
           SELECT 1 FROM game_sessions s
           WHERE s.card_id = ? AND s.player_id = ? AND s.case_id = c.id
         )
       ORDER BY c.id`,
      [difficulty, cardId, playerId],
    );
    if (candidates.length === 0) {
      throw new ApiError("Voce ja jogou todos os casos disponiveis nesta dificuldade.", 409);
    }
    selectedCaseId = Number(candidates[Math.floor(Math.random() * candidates.length)].id);
    run("UPDATE cards SET case_id = NULL, updated_at = ? WHERE card_id = ?", [now, cardId]);
  });

  return { case_id: selectedCaseId };
}

export async function findResumableGameSession(input = {}) {
  const cardId = String(input.card_id ?? input.cardId ?? "").trim();
  const playerId = String(input.user_id ?? input.userId ?? input.player_id ?? input.playerId ?? "").trim();
  if (!cardId || !playerId) {
    throw new ApiError("Os campos 'card_id' e 'player_id' sao obrigatorios.");
  }

  const row = await readOneRow(
    `SELECT * FROM game_sessions
     WHERE card_id = ? AND player_id = ?
     ORDER BY started_at DESC, id DESC LIMIT 1`,
    [cardId, playerId],
  );
  return row?.status === "in_progress" ? getSessionProgress(Number(row.id)) : null;
}

export async function executeLevelQuery(sessionId, levelId, query) {
  if (typeof query !== "string" || !query.trim()) throw new ApiError("O campo 'query' é obrigatório.");

  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessão não encontrada.", 404);
  const level = await getStoredLevel(levelId);
  if (!level || level.case_id !== session.case_id) throw new ApiError("Nível não encontrado para este caso.", 404);
  if (session.status !== "in_progress") throw new ApiError("A sessão já foi finalizada.", 409);
  if (session.current_level_id !== level.id) throw new ApiError("Este não é o nível atual da sessão.", 409);

  const caseItem = await getCase(session.case_id);
  let result = [];
  let error = null;
  const executedAt = currentTime();
  try {
    result = await queryCaseDatabase(caseItem.database_file_path, query);
  } catch (queryError) {
    error = queryError.message;
  }

  let sqlQuery;
  await withTransaction(({ run }) => {
    const inserted = run(
      `INSERT INTO querys(game_session_id, level_id, query, result, error, executed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.id, level.id, query, JSON.stringify(result), error, executedAt],
    );
    sqlQuery = {
      id: Number(inserted.id),
      game_session_id: session.id,
      level_id: Number(level.id),
      query,
      result,
      error,
      executed_at: executedAt,
    };
  });

  return {
    sql_query: sqlQuery,
    result,
    error,
    score_added: 0,
    session: await getGameSession(session.id),
  };
}

function normalizeLevelScore(score) {
  if (score === undefined || score === null) return MAX_GAME_SCORE;
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) throw new ApiError("O campo 'score' deve ser um numero finito.");
  return Math.max(0, Math.min(MAX_GAME_SCORE, Math.round(numericScore)));
}

async function completeCurrentLevel(gameSessionId, session, level, score) {
  await withTransaction(({ one, run }) => {
    const current = one("SELECT status, current_level FROM game_sessions WHERE id = ?", [gameSessionId]);
    if (!current || current.status !== "in_progress" || Number(current.current_level) !== level.id) {
      throw new ApiError("This is not the current level for the session.", 409);
    }

    const finishedAt = currentTime();
    run(
      `UPDATE player_progress SET status = 'completed', score = ?, finished_at = ?
       WHERE game_session_id = ? AND level_id = ?`,
      [score, finishedAt, gameSessionId, level.id],
    );
    const nextLevel = one(
      "SELECT id FROM levels WHERE case_id = ? AND number > ? ORDER BY number LIMIT 1",
      [session.case_id, level.number],
    );
    if (nextLevel) {
      run("UPDATE game_sessions SET current_level = ? WHERE id = ?", [nextLevel.id, gameSessionId]);
      run(
        `INSERT INTO player_progress(game_session_id, level_id, status, score, started_at)
         VALUES (?, ?, 'in_progress', ?, ?)`,
        [gameSessionId, nextLevel.id, score, currentTime()],
      );
    } else {
      run("UPDATE game_sessions SET current_level = NULL WHERE id = ?", [gameSessionId]);
    }
  });
  return getGameSession(gameSessionId);
}

export async function saveCurrentLevelScore(sessionId, levelId, score) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessao nao encontrada.", 404);
  const level = await getStoredLevel(levelId);
  if (!level || level.case_id !== session.case_id) {
    throw new ApiError("Nivel nao encontrado para este caso.", 404);
  }
  if (session.status !== "in_progress" || session.current_level_id !== level.id) {
    throw new ApiError("Este nao e o nivel atual da sessao.", 409);
  }

  const levelScore = normalizeLevelScore(score);
  await withTransaction(({ run }) => run(
    `UPDATE player_progress SET score = ?
     WHERE game_session_id = ? AND level_id = ? AND status = 'in_progress'`,
    [levelScore, session.id, level.id],
  ));
  return { score: levelScore, session: await getGameSession(session.id) };
}

export async function checkLevelAnswers(sessionId, levelId, answers, score) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessao nao encontrada.", 404);
  const level = await getStoredLevel(levelId);
  if (!level || level.case_id !== session.case_id) throw new ApiError("Level not found for this case.", 404);
  if (session.status !== "in_progress") throw new ApiError("The session has already ended.", 409);
  if (session.current_level_id !== level.id) throw new ApiError("This is not the current level for the session.", 409);

  const check = checkAnswers(level, answers);
  if (!check) return { check: false, session };
  const levelScore = normalizeLevelScore(score);
  const updatedSession = await completeCurrentLevel(session.id, session, level, levelScore);
  return {
    check: true,
    score_added: levelScore,
    progress: { level_id: level.id, status: "completed", score: levelScore },
    session: updatedSession,
  };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function listSessionQueries(sessionId) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessao nao encontrada.", 404);
  const queries = await readRows(
    `SELECT id, level_id, query, result, error, executed_at
     FROM querys WHERE game_session_id = ? ORDER BY id`,
    [session.id],
  );
  return queries.map((row) => ({
    id: Number(row.id),
    game_session_id: session.id,
    level_id: Number(row.level_id),
    query: row.query,
    executed: !row.error,
    result: parseJson(row.result),
    error: row.error,
    executed_at: row.executed_at,
  }));
}

export async function useLevelHint(sessionId, levelId, hintId, score) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessão não encontrada.", 404);
  const level = await getStoredLevel(levelId);
  if (!level || level.case_id !== session.case_id) throw new ApiError("Nível não encontrado para este caso.", 404);
  if (session.status !== "in_progress" || session.current_level_id !== level.id) {
    throw new ApiError("A dica só pode ser usada no nível atual da sessão.", 409);
  }
  const id = Number(hintId);
  const hint = level.helps?.id == null
    ? null
    : await readOneRow("SELECT id, title, tip FROM hints WHERE helps_id = ? AND id = ?", [level.helps.id, id]);
  if (!hint) throw new ApiError("Dica não encontrada para este nível.", 404);

  const currentProgress = await readOneRow(
    "SELECT score FROM player_progress WHERE game_session_id = ? AND level_id = ? AND status = 'in_progress'",
    [session.id, level.id],
  );
  if (!currentProgress) throw new ApiError("O progresso do nivel atual nao foi encontrado.", 409);
  const levelScore = score === undefined
    ? Number(currentProgress.score)
    : normalizeLevelScore(score);
  await withTransaction(({ run }) => {
    run(
      "INSERT INTO hint_usage(game_session_id, level_id, hint_id, used_at) VALUES (?, ?, ?, ?)",
      [session.id, level.id, id, currentTime()],
    );
    run(
      "UPDATE player_progress SET score = ? WHERE game_session_id = ? AND level_id = ?",
      [levelScore, session.id, level.id],
    );
  });
  return { used: true, help: level.helps, hint };
}

export async function completeGameSession(sessionId) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessão não encontrada.", 404);
  if (session.status === "completed") return session;

  const incomplete = await readOneRow(
    `SELECT COUNT(*) AS count FROM levels l
     LEFT JOIN player_progress p ON p.level_id = l.id AND p.game_session_id = ?
     WHERE l.case_id = ? AND (p.status IS NULL OR p.status <> 'completed')`,
    [session.id, session.case_id],
  );
  if (Number(incomplete?.count ?? 0) > 0) {
    throw new ApiError("Ainda há níveis não concluídos nesta sessão.", 409);
  }

  await withTransaction(({ one, run }) => {
    const totalScore = Number(one(
      `SELECT COALESCE((
         SELECT p.score FROM player_progress p
         JOIN levels l ON l.id = p.level_id
         WHERE p.game_session_id = ? AND p.status = 'completed'
         ORDER BY l.number DESC LIMIT 1
       ), 0) AS score`,
      [session.id],
    )?.score ?? 0);
    run(
      "UPDATE game_sessions SET score = ?, status = 'completed', current_level = NULL, finished_at = ? WHERE id = ?",
      [totalScore, currentTime(), session.id],
    );
  });
  return getGameSession(session.id);
}

export async function listSessionRanking(cardId, caseId) {
  const rankingCaseId = Number(caseId);
  if (!Number.isInteger(rankingCaseId) || rankingCaseId < 1) {
    throw new ApiError("O campo case_id deve identificar um caso existente.");
  }
  const rankingCardId = String(cardId ?? "").trim();
  if (!rankingCardId) throw new ApiError("O campo card_id é obrigatório.");
  const rows = await readRows(
    `SELECT * FROM game_sessions
     WHERE card_id = ? AND case_id = ? AND status = 'completed'
     ORDER BY score DESC, finished_at ASC, started_at ASC, id ASC`,
    [rankingCardId, rankingCaseId],
  );
  const rankedPlayers = new Map();
  for (const row of rows) {
    const session = toSession(row);
    if (!rankedPlayers.has(session.player_id)) rankedPlayers.set(session.player_id, session);
  }
  return [...rankedPlayers.values()];
}
