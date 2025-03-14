import express from 'express';
import { pool } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

export const router = express.Router();

// Nýskráning notanda
router.post(
  '/register',
  [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert the new user into the database
      const { rows } = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
        [username, passwordHash, 'user']
      );

      const user = rows[0];

      // Create JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

      return res.status(201).json({ token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// Innskráning notanda og útgáfa JWT aðgangstókens
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Finna notanda í gagnagrunni
    const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Staðfesta lykilorð
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Búa til JWT tóken
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Sækja fjölda notenda
router.get('/users', async (req, res) => {
  try {
    // Check if the users table exists
    try {
      await pool.query('SELECT 1 FROM h1todo.users LIMIT 1');
    } catch (tableErr) {
      // If the table doesn't exist, return 0
      console.log('Users table does not exist');
      return res.json({ count: 0 });
    }
    const { rows } = await pool.query('SELECT COUNT(*) FROM h1todo.users');
    const count = parseInt(rows[0].count, 10);
    return res.json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});
