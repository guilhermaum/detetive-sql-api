import { randomUUID } from "node:crypto";

import {
  getCase,
  getStoredLevel,
  readOneRow,
  readRows,
  toSession,
  withTransaction,
} from "./control-db.js";
import { queryCaseDatabase } from "./sqlite.js";

const pointsPerLevel = Number(process.env.SQL_DETECTIVE_POINTS_PER_LEVEL ?? 100);

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
  return toSession(await readOneRow("SELECT * FROM game_sessions WHERE session_id = ?", [sessionId]));
}

export async function startGameSession(input = {}) {
  const caseId = Number(input.case_id ?? input.caseId);
  if (!Number.isInteger(caseId) || caseId < 1) {
    throw new ApiError("O campo 'case_id' deve identificar um caso existente.");
  }

  const caseItem = await getCase(caseId);
  if (!caseItem) throw new ApiError("Caso não encontrado.", 404);

  const sessionId = String(
    input.external_session_id ?? input.externalSessionId ?? input.session_id ?? input.sessionId ?? randomUUID(),
  ).trim();
  const playerId = String(input.player_id ?? input.playerId ?? `test-player-${randomUUID()}`).trim();
  if (!sessionId || !playerId) throw new ApiError("'external_session_id' e 'player_id' não podem ser vazios.");

  await withTransaction(({ one, run }) => {
    if (one("SELECT id FROM game_sessions WHERE session_id = ?", [sessionId])) {
      throw new ApiError("Já existe uma sessão com esse external_session_id.", 409);
    }
    const firstLevel = one("SELECT id FROM levels WHERE case_id = ? ORDER BY number LIMIT 1", [caseId]);
    const startedAt = currentTime();
    run(
      `INSERT INTO game_sessions(session_id, player_id, case_id, status, current_level, score, started_at)
       VALUES (?, ?, ?, 'in_progress', ?, 0, ?)`,
      [sessionId, playerId, caseId, firstLevel?.id ?? null, startedAt],
    );
    if (firstLevel) {
      run(
        `INSERT INTO player_progress(session_id, level_id, status, score, started_at)
         VALUES (?, ?, 'in_progress', 0, ?)`,
        [sessionId, firstLevel.id, startedAt],
      );
    }
  });

  return getGameSession(sessionId);
}

export async function getSessionProgress(sessionId) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessão não encontrada.", 404);
  const progress = await readRows(
    `SELECT p.id, s.id AS session_id, p.level_id, p.status, p.score,
            p.started_at, p.finished_at AS completed_at
     FROM player_progress p
     JOIN game_sessions s ON s.session_id = p.session_id
     JOIN levels l ON l.id = p.level_id
     WHERE p.session_id = ? ORDER BY l.number`,
    [sessionId],
  );
  return {
    session,
    progress: progress.map((row) => ({
      ...row,
      id: Number(row.id),
      session_id: Number(row.session_id),
      level_id: Number(row.level_id),
      score: Number(row.score),
    })),
  };
}

function matchesExpectedResult(rows, template) {
  const expectedRows = Array.isArray(template) ? template : [template];
  if (!expectedRows.length || rows.length !== expectedRows.length) return false;
  const remaining = [...rows];

  return expectedRows.every((expected) => {
    if (!expected || typeof expected !== "object" || Array.isArray(expected)) return false;
    const index = remaining.findIndex((row) => Object.entries(expected).every(([column, value]) =>
      Object.hasOwn(row, column) && String(row[column] ?? "").trim() === String(value ?? "").trim(),
    ));
    if (index < 0) return false;
    remaining.splice(index, 1);
    return true;
  });
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
  let success = false;
  const executedAt = currentTime();
  try {
    result = await queryCaseDatabase(caseItem.database_name, query);
    success = matchesExpectedResult(result, level.template);
  } catch (queryError) {
    error = queryError.message;
  }

  let sqlQuery;
  await withTransaction(({ one, run }) => {
    const inserted = run(
      `INSERT INTO sql_executions(session_id, level_id, query, success, result, error, executed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, level.id, query, success ? 1 : 0, JSON.stringify(result), error, executedAt],
    );
    sqlQuery = {
      id: Number(inserted.id),
      session_id: session.id,
      level_id: Number(level.id),
      query,
      success,
      result,
      error,
      executed_at: executedAt,
    };

    if (!success) return;
    const finishedAt = currentTime();
    run(
      `UPDATE player_progress SET status = 'completed', score = ?, finished_at = ?
       WHERE session_id = ? AND level_id = ?`,
      [pointsPerLevel, finishedAt, sessionId, level.id],
    );
    const nextLevel = one(
      "SELECT id FROM levels WHERE case_id = ? AND number > ? ORDER BY number LIMIT 1",
      [session.case_id, level.number],
    );
    if (nextLevel) {
      run("UPDATE game_sessions SET score = score + ?, current_level = ? WHERE session_id = ?", [pointsPerLevel, nextLevel.id, sessionId]);
      run(
        `INSERT INTO player_progress(session_id, level_id, status, score, started_at)
         VALUES (?, ?, 'in_progress', 0, ?)`,
        [sessionId, nextLevel.id, currentTime()],
      );
    } else {
      run("UPDATE game_sessions SET score = score + ?, current_level = NULL WHERE session_id = ?", [pointsPerLevel, sessionId]);
    }
  });

  return {
    sql_query: sqlQuery,
    success,
    result,
    error,
    score_added: success ? pointsPerLevel : 0,
    session: await getGameSession(sessionId),
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
    `SELECT id, level_id, query, success, result, error, executed_at
     FROM sql_executions WHERE session_id = ? ORDER BY id`,
    [sessionId],
  );
  return queries.map((row) => ({
    id: Number(row.id),
    session_id: session.id,
    level_id: Number(row.level_id),
    query: row.query,
    success: Boolean(row.success),
    result: parseJson(row.result),
    error: row.error,
    executed_at: row.executed_at,
  }));
}

export async function useLevelHint(sessionId, levelId, hintId) {
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

  await withTransaction(({ run }) => run(
    "INSERT INTO hint_usage(session_id, level_id, hint_id, used_at) VALUES (?, ?, ?, ?)",
    [sessionId, level.id, id, currentTime()],
  ));
  return { used: true, help: level.helps, hint };
}

export async function completeGameSession(sessionId) {
  const session = await getGameSession(sessionId);
  if (!session) throw new ApiError("Sessão não encontrada.", 404);
  if (session.status === "completed") return session;

  const incomplete = await readOneRow(
    `SELECT COUNT(*) AS count FROM levels l
     LEFT JOIN player_progress p ON p.level_id = l.id AND p.session_id = ?
     WHERE l.case_id = ? AND (p.status IS NULL OR p.status <> 'completed')`,
    [sessionId, session.case_id],
  );
  if (Number(incomplete?.count ?? 0) > 0) {
    throw new ApiError("Ainda há níveis não concluídos nesta sessão.", 409);
  }

  await withTransaction(({ run }) => run(
    "UPDATE game_sessions SET status = 'completed', current_level = NULL, finished_at = ? WHERE session_id = ?",
    [currentTime(), sessionId],
  ));
  return getGameSession(sessionId);
}
