import { Router } from "express";
import { queryTable } from "../service/sqlite.js";

const sqlController = Router();

sqlController.get("/sql/select", async (req, res) => {
  const { query } = req.body;
  if(query) {
    try {
      const table = await queryTable(query);
      res.status(200).json(table);
    } catch(err) {
      console.error(err);
    }
  } else res.status(400).json({
    message: "Parâmetro 'query' não encontrado."
  });
});

export default sqlController;