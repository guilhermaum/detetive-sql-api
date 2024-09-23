import levels from "../data/levels.js";
import { create } from "../service/firestore.js";

async function insertLevels() {
  for(let level of levels) {
    await create("levels", level);
  }
  console.log("Levels inserteds.");
}

insertLevels();