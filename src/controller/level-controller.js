import { Router } from "express";
import { create, findById } from "../service/firestore.js";

const levelController = Router();

levelController.post("/levels", async (req, res) => {
  const { level, title, stories, tables, der, problems, templates } = req.body;
  const data = { level, title, stories, tables, der, problems, templates };
  const id = await create("levels", data);
  res.status(201).json({ id });
});

levelController.get("/levels/:id", async (req, res) => {
  const { id } = req.params;
  const level = await findById("levels", id);
  res.status(200).json(level);
});

export default levelController;