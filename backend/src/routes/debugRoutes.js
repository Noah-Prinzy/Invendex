import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

export default router;
