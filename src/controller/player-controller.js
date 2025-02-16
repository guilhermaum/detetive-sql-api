import { Router } from 'express';
import {
  create,
  update,
  findAll,
  findWithFilters,
} from '../service/firestore.js';

const playerController = Router();

playerController.post('/players', async (req, res) => {
  try {
    const { username } = req.body;
    const id = await create('players', {
      username,
      won: false,
      currentLevel: 1,
      scoreGame: 0,
    });
    res.status(200).json({ playerId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor. Tente mais tarde.' });
  }
});

playerController.put('/players', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    await update('players', id, data);
    res.status(200).json({ playerId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor. Tente mais tarde.' });
  }
});

playerController.get('/players', async (req, res) => {
  try {
    const players = await findAll('players');
    res.status(200).json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor. Tente mais tarde.' });
  }
});

playerController.get('/players/ranking', async (req, res) => {
  try {
    const fielters = [{ fd: 'won', op: '==', vl: true }];
    const orders = [
      { fd: 'scoreGame', dr: 'desc' },
      { fd: 'departureDate', dr: 'asc' },
    ];
    const players = await findWithFilters('players', fielters, orders);
    res.status(200).json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor. Tente mais tarde.' });
  }
});

export default playerController;
