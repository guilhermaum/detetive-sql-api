import { Router } from "express";
import { connection } from "../sql/db.js";
import { queryTable } from "../service/repository.js";

const sqlController = Router();

sqlController.get("/sql/select", async (req, res) => {
  const { query } = req.body;
  if(query) {
    try {
      const table = await queryTable(connection, query);
      res.status(200).json(table);
    } catch(err) {
      console.error(err);
    }
  } else res.status(400).json({
    message: "Parâmetro 'query' não encontrado."
  });
});

export default sqlController;