import { authenticate } from './sql/db.js';
import { queryTable } from './service/repository.js';
import './firebase/config.js';

async function init() {
  const connection = await authenticate();
  const table = await queryTable(connection, "SELECT * FROM crime_scene_report WHERE type = 'murder' AND date = '20180115' AND city = 'SQL City'");

  for (let row of table) {
    let rowStr = '| ';
    for (let column in row) {
      rowStr += `${row[column]} : ${column} | `;
    }
    console.log(rowStr);
  }
}

init();