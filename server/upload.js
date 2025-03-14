import express from 'express';
import { authRequired } from './middleware.js';

export const router = express.Router();

// Einfaldur upload endapunktur (verður útfært síðar)
router.post('/', authRequired, async (req, res) => {
  res.json({ message: 'File upload functionality will be implemented later' });
});
