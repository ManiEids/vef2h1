import express from 'express';
import { authRequired } from './middleware.js';

export const router = express.Router();

// POST /upload - Simplified version (stub endpoint)
router.post('/', authRequired, async (req, res) => {
  // Return a simple success response for now
  res.json({ message: 'File upload functionality will be implemented later' });
});
