import { Router } from "express";
import { queryTable } from "../service/sqlite.js";
import { Sequelize } from "sequelize";

const sqlController = Router();

sqlController.post("/sql/select", async (req, res) => {
  const { query } = req.body;
  if (query) {
    try {
      const table = await queryTable(query);
      res.status(200).json(table);
    } catch (err) {
      console.error(err);
      if (err instanceof Sequelize.DatabaseError) {
        res
          .status(400)
          .json({ message: "Consulta malformada. Tente novamente." });
      } else {
        res
          .status(500)
          .json({ message: "Erro no servidor. Tente mais tarde." });
      }
    }
  } else {
    res.status(400).json({
      message: "Parâmetro 'query' não encontrado.",
    });
  }
});

export default sqlController;
