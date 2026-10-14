import initSqlJs from "sql.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const databasePath = fileURLToPath(new URL("./database.db", import.meta.url));
const caseDatabaseDirectory = process.env.SQL_DETECTIVE_CASE_DB_DIR
  ? resolve(process.env.SQL_DETECTIVE_CASE_DB_DIR)
  : (process.env.VERCEL
    ? resolve(tmpdir(), "sql-detective-cases")
    : resolve(fileURLToPath(new URL("../../.data/cases/", import.meta.url))));
const SQLReady = initSqlJs({
  locateFile: (file) => fileURLToPath(new URL(`../../node_modules/sql.js/dist/${file}`, import.meta.url)),
});
const seedDatabaseBytes = readFile(databasePath);

function makeReadOnly(SQL, bytes) {
  const database = new SQL.Database(bytes);
  database.exec("PRAGMA query_only = ON");
  return database;
}

const databaseReady = Promise.all([SQLReady, seedDatabaseBytes]).then(([SQL, bytes]) => makeReadOnly(SQL, bytes));

async function createCaseDatabase(databaseName) {
  const [SQL, seedBytes] = await Promise.all([SQLReady, seedDatabaseBytes]);
  const safeName = typeof databaseName === "string" && basename(databaseName) === databaseName
    ? databaseName
    : "";
  if (!safeName) throw new Error("O nome do banco de investigação é inválido.");

  const casePath = resolve(caseDatabaseDirectory, safeName);
  if (!casePath.startsWith(`${caseDatabaseDirectory}${sep}`)) {
    throw new Error("O nome do banco de investigação é inválido.");
  }

  await mkdir(caseDatabaseDirectory, { recursive: true });
  try {
    await readFile(casePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    try {
      await writeFile(casePath, seedBytes, { flag: "wx" });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
    }
  }

  return makeReadOnly(SQL, await readFile(casePath));
}

export { createCaseDatabase, databaseReady };
