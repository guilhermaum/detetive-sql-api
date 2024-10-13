import "dotenv/config";
import levels from "../data/levels.js";
import { create } from "../service/firestore.js";

async function populate() {
  console.log("Creating...");
  try {
    const levelsInserted = [];
    for (let level of levels) {
      const idLevel = await create("levels", level);
      levelsInserted.push(idLevel);
    }
    const idGame = await create("games", { levels: levelsInserted, last: 7 });
    console.log("ID", idGame);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
  console.log("Complete.");
}

populate();
