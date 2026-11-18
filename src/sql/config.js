import initSqlJs from "sql.js";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
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

function caseFileName(databaseFilePath) {
  const normalizedPath = typeof databaseFilePath === "string" ? databaseFilePath.replace(/\\/g, "/") : "";
  const safeName = normalizedPath.startsWith("cases/") ? normalizedPath.slice("cases/".length) : "";
  if (!safeName || basename(safeName) !== safeName || !/^[a-z0-9_.-]+\.(?:db|sql|png|jpe?g|gif|webp)$/i.test(safeName)) {
    throw new Error("O caminho do banco de investigação é inválido.");
  }
  return safeName;
}

function resolveCaseFile(databaseFilePath) {
  const safeName = caseFileName(databaseFilePath);
  const casePath = resolve(caseDatabaseDirectory, safeName);
  if (!casePath.startsWith(`${caseDatabaseDirectory}${sep}`)) {
    throw new Error("O caminho do banco de investigação é inválido.");
  }
  return { safeName, casePath };
}

function inputError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function decodeSqlScript(bytes) {
  let script;
  try {
    script = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    throw inputError("O arquivo não está codificado como UTF-8.");
  }
  if (!script.trim()) throw inputError("O arquivo SQL está vazio.");
  return script;
}

export async function saveCaseSqlFile(bytes) {
  if (!Buffer.isBuffer(bytes)) throw inputError("Envie um arquivo .sql no campo 'database_file'.");

  const script = decodeSqlScript(bytes);
  const SQL = await SQLReady;
  const database = new SQL.Database();
  try {
    database.exec(script);
  } catch (error) {
    throw inputError(`O arquivo .sql não pôde ser carregado: ${error.message}`);
  } finally {
    database.close();
  }

  const filename = `${randomUUID()}.sql`;
  await mkdir(caseDatabaseDirectory, { recursive: true });
  await writeFile(resolve(caseDatabaseDirectory, filename), bytes, { flag: "wx" });
  return `cases/${filename}`;
}

function isSupportedImage(bytes, extension) {
  if (extension === ".png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === ".gif") {
    const signature = bytes.subarray(0, 6).toString("ascii");
    return signature === "GIF87a" || signature === "GIF89a";
  }
  return extension === ".webp"
    && bytes.length >= 12
    && bytes.subarray(0, 4).toString("ascii") === "RIFF"
    && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function saveCaseImageFile(bytes, filename) {
  if (!Buffer.isBuffer(bytes)) throw inputError("Envie uma imagem no campo 'database_image'.");
  const extension = extname(typeof filename === "string" ? filename : "").toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(extension) || !isSupportedImage(bytes, extension)) {
    throw inputError("The 'database_image' field must contain a valid PNG, JPEG, GIF, or WEBP image.");
  }

  const filenameOnDisk = `${randomUUID()}${extension}`;
  await mkdir(caseDatabaseDirectory, { recursive: true });
  await writeFile(resolve(caseDatabaseDirectory, filenameOnDisk), bytes, { flag: "wx" });
  return `cases/${filenameOnDisk}`;
}

export async function readCaseDatabaseImage(databaseImagePath) {
  if (!databaseImagePath) return null;
  const { safeName, casePath } = resolveCaseFile(databaseImagePath);
  const extension = extname(safeName).toLowerCase();
  const contentType = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  }[extension];
  if (!contentType) return null;
  try {
    return { bytes: await readFile(casePath), contentType };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteCaseDatabaseFile(databaseFilePath) {
  const { casePath } = resolveCaseFile(databaseFilePath);
  try {
    await unlink(casePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function createCaseDatabase(databaseFilePath) {
  const [SQL, seedBytes] = await Promise.all([SQLReady, seedDatabaseBytes]);
  const { safeName, casePath } = resolveCaseFile(databaseFilePath);

  await mkdir(caseDatabaseDirectory, { recursive: true });
  let bytes;
  try {
    bytes = await readFile(casePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (safeName.toLowerCase().endsWith(".sql")) {
      throw new Error("O arquivo SQL do caso não foi encontrado.");
    }
    try {
      await writeFile(casePath, seedBytes, { flag: "wx" });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
    }
    bytes = await readFile(casePath);
  }

  if (safeName.toLowerCase().endsWith(".sql")) {
    const database = new SQL.Database();
    try {
      database.exec(decodeSqlScript(bytes));
      database.exec("PRAGMA query_only = ON");
      return database;
    } catch (error) {
      database.close();
      throw error;
    }
  }

  return makeReadOnly(SQL, bytes);
}

export { createCaseDatabase, databaseReady };
