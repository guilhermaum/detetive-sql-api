import { Sequelize } from 'sequelize';
import SQLite from 'sqlite3';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "sql-murder-mystery.db");

const connection = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  dialectOptions: { mode: SQLite.OPEN_READONLY },
});

try {
  await connection.authenticate();
}
catch(err) {
  console.log("Connection with database failed.")
  console.error(err);
}

export { connection };
