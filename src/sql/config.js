import { Sequelize } from 'sequelize';
import SQLite from 'sqlite3';

const connection = new Sequelize('database', 'username', '12345678', {
  dialect: 'sqlite',
  storage: './sql-murder-mystery.db',
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
