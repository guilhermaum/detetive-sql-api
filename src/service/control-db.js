import initSqlJs from "sql.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import seedCases from "../data/cases.js";
import { deleteCaseDatabaseFile, readCaseDatabaseImage as readCaseImageFile, saveCaseImageFile, saveCaseSqlFile } from "../sql/config.js";

const controlDatabasePath = process.env.SQL_DETECTIVE_CONTROL_DB
  ? resolve(process.env.SQL_DETECTIVE_CONTROL_DB)
  : (process.env.VERCEL
    ? resolve(tmpdir(), "sql-detective-control.db")
    : fileURLToPath(new URL("../../.data/control.db", import.meta.url)));

const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    database_file_path TEXT NOT NULL UNIQUE,
    database_image_path TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    card_id TEXT PRIMARY KEY,
    script_id TEXT,
    session_id TEXT,
    case_distribution TEXT NOT NULL DEFAULT 'aleatorio',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS script_case_assignments (
    script_id TEXT NOT NULL,
    card_id TEXT NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
    difficulty TEXT NOT NULL,
    case_index INTEGER NOT NULL DEFAULT 0,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY(script_id, card_id, difficulty, case_index),
    UNIQUE(script_id, case_id)
  );

  CREATE TABLE IF NOT EXISTS script_case_overrides (
    script_id TEXT NOT NULL,
    card_id TEXT NOT NULL REFERENCES cards(card_id) ON DELETE CASCADE,
    difficulty TEXT NOT NULL,
    case_index INTEGER NOT NULL DEFAULT 0,
    player_id TEXT NOT NULL,
    base_case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    session_id TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY(script_id, card_id, difficulty, case_index, player_id),
    UNIQUE(script_id, player_id, case_id)
  );

  CREATE TABLE IF NOT EXISTS helps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level_id INTEGER NOT NULL UNIQUE REFERENCES levels(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    tips TEXT NOT NULL DEFAULT '[]',
    problems TEXT NOT NULL DEFAULT '[]',
    template TEXT NOT NULL DEFAULT '{}',
    helps INTEGER REFERENCES helps(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id, number)
  );

  CREATE TABLE IF NOT EXISTS hints (
    helps_id INTEGER NOT NULL REFERENCES helps(id) ON DELETE CASCADE,
    id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tip TEXT NOT NULL,
    PRIMARY KEY(helps_id, id)
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    card_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT,
    case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_level INTEGER REFERENCES levels(id) ON DELETE SET NULL,
    score INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    finished_at TEXT
  );

  CREATE TABLE IF NOT EXISTS player_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    score INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    UNIQUE(game_session_id, level_id)
  );

  CREATE TABLE IF NOT EXISTS sql_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    success INTEGER NOT NULL,
    result TEXT NOT NULL,
    error TEXT,
    executed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS querys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result TEXT NOT NULL,
    error TEXT,
    executed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hint_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    hint_id INTEGER NOT NULL,
    used_at TEXT NOT NULL
  );
`;

let persistQueue = Promise.resolve();

function prepare(database, sql, values = []) {
  const statement = database.prepare(sql);
  statement.bind(values);
  return statement;
}

function readOne(database, sql, values = []) {
  const statement = prepare(database, sql, values);
  try {
    return statement.step() ? statement.getAsObject() : null;
  } finally {
    statement.free();
  }
}

function readMany(database, sql, values = []) {
  const statement = prepare(database, sql, values);
  const rows = [];
  try {
    while (statement.step()) rows.push(statement.getAsObject());
  } finally {
    statement.free();
  }
  return rows;
}

function execute(database, sql, values = []) {
  database.run(sql, values);
  return {
    id: database.exec("SELECT last_insert_rowid() AS id")[0]?.values[0]?.[0] ?? null,
    changes: database.getRowsModified(),
  };
}

function json(value, fallback) {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serialize(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function levelHelpItems(input = {}) {
  if (input.helps && typeof input.helps === "object" && !Array.isArray(input.helps)) {
    return [
      { title: "Quais tabelas devo usar na consulta?", tip: input.helps.help_table },
      { title: "Quais colunas devo usar na consulta?", tip: input.helps.help_column },
      { title: "Quais operadores devo usar na consulta?", tip: input.helps.help_operation },
    ];
  }
  if (Array.isArray(input.hints)) return input.hints;
  return Array.isArray(input.helps) ? input.helps : [];
}

function insertLevel(database, caseId, input = {}) {
  const number = Number(input.number);
  const levelNumber = Number.isInteger(number) && number > 0
    ? number
    : (readOne(database, "SELECT COALESCE(MAX(number), 0) + 1 AS number FROM levels WHERE case_id = ?", [caseId]).number);

  const inserted = execute(
    database,
    `INSERT INTO levels(case_id, number, tips, problems, template, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      caseId,
      levelNumber,
      serialize(input.tips, ""),
      serialize(input.problems, ""),
      serialize(input.template, {}),
      input.created_at ?? new Date().toISOString(),
    ],
  );
  const helpGroup = execute(database, "INSERT INTO helps(level_id) VALUES (?)", [inserted.id]);
  execute(database, "UPDATE levels SET helps = ? WHERE id = ?", [helpGroup.id, inserted.id]);

  const hints = levelHelpItems(input);
  hints.forEach((hint, index) => {
    execute(
      database,
      "INSERT INTO hints(helps_id, id, title, tip) VALUES (?, ?, ?, ?)",
      [helpGroup.id, index + 1, String(hint?.title ?? `Dica ${index + 1}`), String(hint?.tip ?? "")],
    );
  });
  return inserted.id;
}

function seedDatabase(database) {
  const existing = readOne(database, "SELECT COUNT(*) AS count FROM cases");
  if (existing?.count) return;

  const legacyDatabaseName = readMany(database, "PRAGMA table_info(cases)")
    .some((column) => column.name === "database_name" && Number(column.notnull) === 1);
  const timestamp = new Date().toISOString();
  database.exec("BEGIN");
  try {
    seedCases.forEach((seedCase, index) => {
      const id = Number.isInteger(seedCase.id) ? seedCase.id : index + 1;
      const databaseFilePath = seedCase.database_file_path ?? `cases/case-${id}.db`;
      const values = [
        id,
        seedCase.name ?? seedCase.nome,
        seedCase.description ?? "",
        seedCase.difficulty ?? "medium",
      ];
      if (legacyDatabaseName) {
        execute(
          database,
          `INSERT INTO cases(id, name, description, difficulty, database_name, database_file_path, database_image_path, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
          [...values, basename(databaseFilePath), databaseFilePath, seedCase.created_at ?? timestamp],
        );
      } else {
        execute(
          database,
          `INSERT INTO cases(id, name, description, difficulty, database_file_path, database_image_path, created_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?)`,
          [...values, databaseFilePath, seedCase.created_at ?? timestamp],
        );
      }
      seedCase.levels.forEach((level) => insertLevel(database, id, level));
    });
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function migrateLevelCreatedAt(database) {
  const columns = readMany(database, "PRAGMA table_info(levels)");
  if (columns.some((column) => column.name === "created_at")) return;

  database.run("ALTER TABLE levels ADD COLUMN created_at TEXT");
  database.run(`
    UPDATE levels
    SET created_at = COALESCE(
      (SELECT cases.created_at FROM cases WHERE cases.id = levels.case_id),
      CURRENT_TIMESTAMP
    )
    WHERE created_at IS NULL
  `);
}

function migrateCaseDatabaseFilePath(database) {
  const columns = readMany(database, "PRAGMA table_info(cases)");
  if (columns.some((column) => column.name === "database_file_path")) return;

  database.run("ALTER TABLE cases ADD COLUMN database_file_path TEXT");
  const oldColumn = columns.some((column) => column.name === "database_name") ? "database_name" : "NULL";
  const rows = readMany(database, `SELECT id, ${oldColumn} AS old_path FROM cases`);
  rows.forEach((row) => {
    const oldName = typeof row.old_path === "string" ? row.old_path.replace(/\\/g, "/") : "";
    const safeName = basename(oldName) === oldName && /^[a-z0-9_.-]+\.db$/i.test(oldName)
      ? oldName
      : `case-${row.id}.db`;
    database.run("UPDATE cases SET database_file_path = ? WHERE id = ?", [`cases/${safeName}`, row.id]);
  });
  database.run("CREATE UNIQUE INDEX IF NOT EXISTS cases_database_file_path_unique ON cases(database_file_path)");
}

function migrateCaseDatabaseImagePath(database) {
  const columns = readMany(database, "PRAGMA table_info(cases)");
  if (columns.some((column) => column.name === "database_image_path")) return;
  database.run("ALTER TABLE cases ADD COLUMN database_image_path TEXT");
}

function migrateGameSessionParticipantFields(database) {
  const columns = readMany(database, "PRAGMA table_info(game_sessions)");
  if (!columns.some((column) => column.name === "card_id")) {
    database.run("ALTER TABLE game_sessions ADD COLUMN card_id TEXT");
  }
  if (!columns.some((column) => column.name === "player_name")) {
    database.run("ALTER TABLE game_sessions ADD COLUMN player_name TEXT");
  }
}

function migrateCardContextFields(database) {
  const columns = readMany(database, "PRAGMA table_info(cards)");
  if (!columns.some((column) => column.name === "script_id")) {
    database.run("ALTER TABLE cards ADD COLUMN script_id TEXT");
  }
  if (!columns.some((column) => column.name === "session_id")) {
    database.run("ALTER TABLE cards ADD COLUMN session_id TEXT");
  }
}

function migrateObsoleteGameSessionLineage(database) {
  const columns = readMany(database, "PRAGMA table_info(game_sessions)");
  const obsoleteColumns = ["continuation_id", "session_number", "parent_session_id"];
  if (!columns.some((column) => obsoleteColumns.includes(column.name))) return;

  database.exec("PRAGMA foreign_keys = OFF");
  database.exec("PRAGMA legacy_alter_table = ON");
  database.exec("BEGIN");
  try {
    database.run("ALTER TABLE game_sessions RENAME TO game_sessions_legacy");
    database.run(`
      CREATE TABLE game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        card_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT,
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'in_progress',
        current_level INTEGER REFERENCES levels(id) ON DELETE SET NULL,
        score INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        finished_at TEXT
      )
    `);
    database.run(
      `INSERT INTO game_sessions(id, session_id, card_id, player_id, player_name, case_id,
         status, current_level, score, started_at, finished_at)
       SELECT id, session_id, COALESCE(card_id, ''), player_id, player_name, case_id,
         CASE WHEN status = 'continued' THEN 'abandoned' ELSE status END,
         current_level, score, started_at, finished_at
       FROM game_sessions_legacy`,
    );
    database.run("DROP TABLE game_sessions_legacy");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.exec("PRAGMA legacy_alter_table = OFF");
    database.exec("PRAGMA foreign_keys = ON");
  }
}

function migrateGameSessionReferences(database) {
  const migrations = {
    player_progress: {
      create: `CREATE TABLE player_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'in_progress',
        score INTEGER NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        UNIQUE(game_session_id, level_id)
      )`,
      columns: "id, game_session_id, level_id, status, score, started_at, finished_at",
      select: "legacy.id, game_sessions.id, legacy.level_id, legacy.status, legacy.score, legacy.started_at, legacy.finished_at",
    },
    sql_executions: {
      create: `CREATE TABLE sql_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        success INTEGER NOT NULL,
        result TEXT NOT NULL,
        error TEXT,
        executed_at TEXT NOT NULL
      )`,
      columns: "id, game_session_id, level_id, query, success, result, error, executed_at",
      select: "legacy.id, game_sessions.id, legacy.level_id, legacy.query, legacy.success, legacy.result, legacy.error, legacy.executed_at",
    },
    querys: {
      create: `CREATE TABLE querys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        result TEXT NOT NULL,
        error TEXT,
        executed_at TEXT NOT NULL
      )`,
      columns: "id, game_session_id, level_id, query, result, error, executed_at",
      select: "legacy.id, game_sessions.id, legacy.level_id, legacy.query, legacy.result, legacy.error, legacy.executed_at",
    },
    hint_usage: {
      create: `CREATE TABLE hint_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        level_id INTEGER NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
        hint_id INTEGER NOT NULL,
        used_at TEXT NOT NULL
      )`,
      columns: "id, game_session_id, level_id, hint_id, used_at",
      select: "legacy.id, game_sessions.id, legacy.level_id, legacy.hint_id, legacy.used_at",
    },
  };

  for (const [tableName, migration] of Object.entries(migrations)) {
    const columns = readMany(database, `PRAGMA table_info(${tableName})`);
    if (columns.some((column) => column.name === "game_session_id")) continue;

    const legacyTable = `${tableName}_legacy`;
    database.exec("BEGIN");
    try {
      database.run(`ALTER TABLE ${tableName} RENAME TO ${legacyTable}`);
      database.run(migration.create);
      database.run(
        `INSERT INTO ${tableName}(${migration.columns})
         SELECT ${migration.select}
         FROM ${legacyTable} AS legacy
         JOIN game_sessions ON game_sessions.session_id = legacy.session_id`,
      );
      database.run(`DROP TABLE ${legacyTable}`);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}

function migrateGameScoreCeiling(database) {
  database.run("UPDATE game_sessions SET score = MIN(MAX(score, 0), 100)");
  database.run("UPDATE player_progress SET score = MIN(MAX(score, 0), 100)");
}

async function initialize() {
  await mkdir(dirname(controlDatabasePath), { recursive: true });
  const SQL = await initSqlJs({
    locateFile: (file) => fileURLToPath(new URL(`../../node_modules/sql.js/dist/${file}`, import.meta.url)),
  });

  let database;
  try {
    database = new SQL.Database(await readFile(controlDatabasePath));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    database = new SQL.Database();
  }

  database.exec(schema);
  migrateCardContextFields(database);
  migrateCaseDatabaseFilePath(database);
  migrateCaseDatabaseImagePath(database);
  migrateGameSessionParticipantFields(database);
  migrateObsoleteGameSessionLineage(database);
  migrateLevelCreatedAt(database);
  migrateGameSessionReferences(database);
  migrateGameScoreCeiling(database);
  seedDatabase(database);
  const initialBytes = Buffer.from(database.export());
  await writeFile(controlDatabasePath, initialBytes);
  return database;
}

export const databaseReady = initialize();

export async function readOneRow(sql, values = []) {
  const database = await databaseReady;
  return readOne(database, sql, values);
}

export async function readRows(sql, values = []) {
  const database = await databaseReady;
  return readMany(database, sql, values);
}

export async function withTransaction(callback) {
  const database = await databaseReady;
  database.exec("BEGIN");
  try {
    const result = callback({
      one: (sql, values = []) => readOne(database, sql, values),
      many: (sql, values = []) => readMany(database, sql, values),
      run: (sql, values = []) => execute(database, sql, values),
    });
    database.exec("COMMIT");
    persistQueue = persistQueue.then(() => writeFile(controlDatabasePath, Buffer.from(database.export())));
    await persistQueue;
    return result;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // The transaction may already have committed if writing the file failed.
    }
    throw error;
  }
}

function toCase(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    difficulty: row.difficulty,
    database_file_path: row.database_file_path,
    database_image_path: row.database_image_path ?? null,
    database_image_url: row.database_image_path ? `/cases/${Number(row.id)}/database-image` : null,
    created_at: row.created_at,
    level_count: Number(row.level_count ?? 0),
  };
}

const caseSelect = `
  SELECT c.*, (SELECT COUNT(*) FROM levels l WHERE l.case_id = c.id) AS level_count
  FROM cases c`;

export async function listCases(difficulty) {
  const where = difficulty ? " WHERE lower(c.difficulty) = lower(?)" : "";
  const rows = await readRows(`${caseSelect}${where} ORDER BY c.id`, difficulty ? [difficulty] : []);
  return rows.map(toCase);
}

export async function getCase(id) {
  const row = await readOneRow(`${caseSelect} WHERE c.id = ?`, [Number(id)]);
  return toCase(row);
}

export async function createCase(input) {
  const databaseFilePath = await saveCaseSqlFile(input.database_file);
  let databaseImagePath = null;
  try {
    if (input.database_image) {
      databaseImagePath = await saveCaseImageFile(input.database_image, input.database_image_filename);
    }
    return await withTransaction(({ one, many, run }) => {
      const name = input.name ?? input.nome;
      const columns = many("PRAGMA table_info(cases)");
      const legacyDatabaseName = columns.find((column) => column.name === "database_name" && Number(column.notnull) === 1);
      const createdAt = new Date().toISOString();
      const inserted = legacyDatabaseName
        ? run(
          `INSERT INTO cases(name, description, difficulty, database_name, database_file_path, database_image_path, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [String(name), String(input.description ?? ""), String(input.difficulty ?? "medium"), basename(databaseFilePath), databaseFilePath, databaseImagePath, createdAt],
        )
        : run(
          `INSERT INTO cases(name, description, difficulty, database_file_path, database_image_path, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [String(name), String(input.description ?? ""), String(input.difficulty ?? "medium"), databaseFilePath, databaseImagePath, createdAt],
        );
      if (Array.isArray(input.levels)) input.levels.forEach((level) => insertLevelWith(run, one, inserted.id, level));
      const row = one(`${caseSelect} WHERE c.id = ?`, [inserted.id]);
      return toCase(row);
    });
  } catch (error) {
    await Promise.allSettled([
      deleteCaseDatabaseFile(databaseFilePath),
      ...(databaseImagePath ? [deleteCaseDatabaseFile(databaseImagePath)] : []),
    ]);
    throw error;
  }
}

function insertLevelWith(run, one, caseId, input = {}) {
  const requestedNumber = Number(input.number);
  const number = Number.isInteger(requestedNumber) && requestedNumber > 0
    ? requestedNumber
    : Number(one("SELECT COALESCE(MAX(number), 0) + 1 AS number FROM levels WHERE case_id = ?", [caseId]).number);
  const level = run(
    `INSERT INTO levels(case_id, number, tips, problems, template, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [caseId, number, serialize(input.tips, ""), serialize(input.problems, ""), serialize(input.template, {}), input.created_at ?? new Date().toISOString()],
  );
  const helpGroup = run("INSERT INTO helps(level_id) VALUES (?)", [level.id]);
  run("UPDATE levels SET helps = ? WHERE id = ?", [helpGroup.id, level.id]);
  const hints = levelHelpItems(input);
  hints.forEach((hint, index) => run(
    "INSERT INTO hints(helps_id, id, title, tip) VALUES (?, ?, ?, ?)",
    [helpGroup.id, index + 1, String(hint?.title ?? `Dica ${index + 1}`), String(hint?.tip ?? "")],
  ));
  return level.id;
}

export async function updateCase(id, input) {
  let newDatabaseFilePath = null;
  let newDatabaseImagePath = null;
  try {
    if (input.database_file !== undefined) newDatabaseFilePath = await saveCaseSqlFile(input.database_file);
    if (input.database_image !== undefined) {
      newDatabaseImagePath = await saveCaseImageFile(input.database_image, input.database_image_filename);
    }

    const result = await withTransaction(({ one, many, run }) => {
      const current = one("SELECT * FROM cases WHERE id = ?", [Number(id)]);
      if (!current) return null;
      const name = input.name ?? input.nome ?? current.name;
      const databaseFilePath = newDatabaseFilePath ?? current.database_file_path;
      const databaseImagePath = newDatabaseImagePath ?? current.database_image_path ?? null;
      const hasLegacyDatabaseName = many("PRAGMA table_info(cases)")
        .some((column) => column.name === "database_name" && Number(column.notnull) === 1);
      const updateSql = hasLegacyDatabaseName
        ? `UPDATE cases SET name = ?, description = ?, difficulty = ?, database_name = ?, database_file_path = ?, database_image_path = ? WHERE id = ?`
        : `UPDATE cases SET name = ?, description = ?, difficulty = ?, database_file_path = ?, database_image_path = ? WHERE id = ?`;
      const values = hasLegacyDatabaseName
        ? [String(name), String(input.description ?? current.description), String(input.difficulty ?? current.difficulty), basename(databaseFilePath), databaseFilePath, databaseImagePath, Number(id)]
        : [String(name), String(input.description ?? current.description), String(input.difficulty ?? current.difficulty), databaseFilePath, databaseImagePath, Number(id)];
      run(updateSql, values);
      return {
        item: toCase(one(`${caseSelect} WHERE c.id = ?`, [Number(id)])),
        oldDatabaseFilePath: current.database_file_path,
        oldDatabaseImagePath: current.database_image_path,
      };
    });

    if (!result) {
      await Promise.allSettled([
        ...(newDatabaseFilePath ? [deleteCaseDatabaseFile(newDatabaseFilePath)] : []),
        ...(newDatabaseImagePath ? [deleteCaseDatabaseFile(newDatabaseImagePath)] : []),
      ]);
      return null;
    }

    const obsoleteFiles = [];
    if (newDatabaseFilePath && result.oldDatabaseFilePath !== newDatabaseFilePath) {
      obsoleteFiles.push(deleteCaseDatabaseFile(result.oldDatabaseFilePath));
    }
    if (newDatabaseImagePath && result.oldDatabaseImagePath && result.oldDatabaseImagePath !== newDatabaseImagePath) {
      obsoleteFiles.push(deleteCaseDatabaseFile(result.oldDatabaseImagePath));
    }
    await Promise.all(obsoleteFiles);
    return result.item;
  } catch (error) {
    await Promise.allSettled([
      ...(newDatabaseFilePath ? [deleteCaseDatabaseFile(newDatabaseFilePath)] : []),
      ...(newDatabaseImagePath ? [deleteCaseDatabaseFile(newDatabaseImagePath)] : []),
    ]);
    throw error;
  }
}

export async function getCaseImage(caseId) {
  const row = await readOneRow("SELECT database_image_path FROM cases WHERE id = ?", [Number(caseId)]);
  if (!row?.database_image_path) return null;
  return readCaseImageFile(row.database_image_path);
}

export async function deleteCase(id) {
  const current = await readOneRow("SELECT database_file_path, database_image_path FROM cases WHERE id = ?", [Number(id)]);
  if (!current) return false;
  const removed = await withTransaction(({ run }) => run("DELETE FROM cases WHERE id = ?", [Number(id)]).changes > 0);
  if (removed) {
    await Promise.all([
      deleteCaseDatabaseFile(current.database_file_path),
      ...(current.database_image_path ? [deleteCaseDatabaseFile(current.database_image_path)] : []),
    ]);
  }
  return removed;
}

function textValue(value, fallback = "") {
  const parsed = json(value, fallback);
  return Array.isArray(parsed) ? parsed.join("\n") : String(parsed ?? "");
}

function levelHelp(databaseHelpers, row) {
  if (row.helps == null) return null;
  const help = {
    id: Number(row.helps),
    level_id: Number(row.id),
    help_table: "",
    help_column: "",
    help_operation: "",
  };
  databaseHelpers.many("SELECT title, tip FROM hints WHERE helps_id = ? ORDER BY id", [row.helps])
    .forEach((hint) => {
      const title = String(hint.title).toLocaleLowerCase();
      if (title.includes("tabelas")) help.help_table = hint.tip;
      else if (title.includes("colunas")) help.help_column = hint.tip;
      else if (title.includes("operadores")) help.help_operation = hint.tip;
    });
  return help;
}

function levelWithHints(databaseHelpers, row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    case_id: Number(row.case_id),
    number: Number(row.number),
    tips: textValue(row.tips, row.tips),
    problems: textValue(row.problems, row.problems),
    template: json(row.template, {}),
    created_at: row.created_at,
    helps: levelHelp(databaseHelpers, row),
  };
}

const levelSelect = "SELECT id, case_id, number, tips, problems, template, helps, created_at FROM levels";

export async function listLevels(caseId) {
  const database = await databaseReady;
  const caseRow = readOne(database, "SELECT id FROM cases WHERE id = ?", [Number(caseId)]);
  if (!caseRow) return null;
  const rows = readMany(database, `${levelSelect} WHERE case_id = ? ORDER BY number`, [Number(caseId)]);
  const helpers = { many: (sql, values) => readMany(database, sql, values) };
  return rows.map((row) => levelWithHints(helpers, row));
}

export async function getStoredLevel(levelId) {
  const database = await databaseReady;
  const row = readOne(database, `${levelSelect} WHERE id = ?`, [Number(levelId)]);
  return levelWithHints({ many: (sql, values) => readMany(database, sql, values) }, row);
}

export async function createLevel(caseId, input) {
  return withTransaction(({ one, many, run }) => {
    if (!one("SELECT id FROM cases WHERE id = ?", [Number(caseId)])) return null;
    const id = insertLevelWith(run, one, Number(caseId), input);
    const row = one(`${levelSelect} WHERE id = ?`, [id]);
    return levelWithHints({ many }, row);
  });
}

export async function updateLevel(levelId, input) {
  return withTransaction(({ one, many, run }) => {
    const current = one(`${levelSelect} WHERE id = ?`, [Number(levelId)]);
    if (!current) return null;
    const number = input.number === undefined ? Number(current.number) : Number(input.number);
    run(
      `UPDATE levels SET number = ?, tips = ?, problems = ?, template = ? WHERE id = ?`,
      [number, serialize(input.tips === undefined ? json(current.tips, []) : input.tips, []), serialize(input.problems === undefined ? json(current.problems, []) : input.problems, []), serialize(input.template === undefined ? json(current.template, {}) : input.template, {}), Number(levelId)],
    );
    if (input.helps !== undefined || Array.isArray(input.hints)) {
      if (current.helps == null) {
        const group = run("INSERT INTO helps(level_id) VALUES (?)", [Number(levelId)]);
        run("UPDATE levels SET helps = ? WHERE id = ?", [group.id, Number(levelId)]);
        current.helps = group.id;
      }
      run("DELETE FROM hints WHERE helps_id = ?", [current.helps]);
      const hints = levelHelpItems(input);
      hints.forEach((hint, index) => run(
        "INSERT INTO hints(helps_id, id, title, tip) VALUES (?, ?, ?, ?)",
        [current.helps, index + 1, String(hint?.title ?? `Dica ${index + 1}`), String(hint?.tip ?? "")],
      ));
    }
    return levelWithHints({ many }, one(`${levelSelect} WHERE id = ?`, [Number(levelId)]));
  });
}

export async function deleteLevel(levelId) {
  return withTransaction(({ run }) => run("DELETE FROM levels WHERE id = ?", [Number(levelId)]).changes > 0);
}

export function toSession(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    card_id: row.card_id ?? null,
    player_id: row.player_id,
    player_name: row.player_name ?? null,
    case_id: Number(row.case_id),
    status: row.status,
    current_level_id: row.current_level == null ? null : Number(row.current_level),
    score: Number(row.score),
    started_at: row.started_at,
    finished_at: row.finished_at,
  };
}
