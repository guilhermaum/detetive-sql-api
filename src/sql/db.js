import { Sequelize } from 'sequelize';
import SQLite from 'sqlite3';

const connection = new Sequelize('database', 'username', '12345678', {
  dialect: 'sqlite',
  storage: './sql-murder-mystery.db',
  dialectOptions: {
    mode: SQLite.OPEN_READONLY,
  },
});

const authenticate = async () => {
  await connection.authenticate();
  return connection;
};

export { authenticate };
