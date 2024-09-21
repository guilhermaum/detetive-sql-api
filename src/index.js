import { authenticate } from './sql/db.js';
import { queryTable } from './service/repository.js';
import './firebase/config.js';

async function init() {
  const connection = await authenticate();
  const table = await queryTable(connection, "SELECT * FROM users;");

  for (let row of table) {
    let rowStr = '| ';
    for (let column in row) {
      rowStr += `${row[column]} : ${column} | `;
    }
    console.log(rowStr);
  }
}

init();