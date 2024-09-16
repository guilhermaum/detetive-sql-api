import { Sequelize } from 'sequelize';
import SQLite from 'sqlite3';

const connection = new Sequelize('database', 'username', '12345678', {
  dialect: 'sqlite',
  storage: './database.sqlite',
  dialectOptions: {
    mode: SQLite.OPEN_READWRITE | SQLite.OPEN_CREATE | SQLite.OPEN_FULLMUTEX,
  },
});

const authenticate = async () => {
  await connection.authenticate();
  return connection;
};

export { authenticate };
