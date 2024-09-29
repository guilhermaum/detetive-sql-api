import "dotenv/config";
import levels from "../data/levels.js";
import { create } from "../service/firestore.js";

async function insertLevels() {
  try {
    for (let level of levels) {
      const id = await create("levels", level);
      console.log(id);
    }
    console.log("Levels inserteds.");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor. Tente mais tarde." });
  }
}

insertLevels();

// game is { levels, last }
