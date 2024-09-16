import { authenticate } from './sql/db.js';
import {
  createTableUsers,
  insertTableUsers,
  queryTable,
} from './service/repository.js';

async function init() {
  const connection = await authenticate();

  // await createTableUsers(connection);
  // await insertTableUsers(connection);

  const table = await queryTable(
    connection,
    "SELECT id, COUNT(*) AS qnt FROM (\
        SELECT * FROM users\
        UNION ALL\
        SELECT * FROM users WHERE name LIKE '%a%'\
    ) AS combined\
    GROUP BY id\
    HAVING qnt != 2;",
  );

  for (let row of table) {
    let rowStr = '| ';
    for (let column in row) {
      rowStr += `${row[column]} : ${column} | `;
    }
    console.log(rowStr);
  }
}

init();
