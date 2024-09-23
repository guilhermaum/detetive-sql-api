import "dotenv/config";
import levels from "../data/levels.js";
import { create } from "../service/firestore.js";

async function insertLevels() {
  for(let level of levels) {
    const id = await create("levels", level);
    console.log(id);
  }
  console.log("Levels inserteds.");
}

insertLevels();