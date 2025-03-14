// Auth module - Auðkenningarkerfi
import express from 'express';
import { pool } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { authRequired, adminRequired } from './middleware.js';

export const router = express.Router();

// Nýskráning notanda - register new user
router.post(
  '/register',
  [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  async (req, res) => {
    // Validation check - Villa ef input rangt
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      // Hasha lykilorð með bcrypt
      const passwordHash = await bcrypt.hash(password, 10);

      // Setja notanda í gagnagrunn
      const { rows } = await pool.query(
        'INSERT INTO h1todo.users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
        [username, passwordHash, 'user']
      );

      const user = rows[0];

      // Búa til JWT token
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

// Innskráning notanda - login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt fyrir ${username}`);
  
  // Einföld validation
  if (!username || !password) {
    console.log('Login failed: Vantar username eða password');
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Athuga hvort notandi er til
    const userResult = await pool.query(
      'SELECT * FROM h1todo.users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      console.log(`Login failed: User ${username} not found`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    console.log(`User found: ${username}, ID: ${user.id}, Role: ${user.role}`);
    
    // TMP fyrir verkefni: Leyfa admin/admin og user/user innskráningu
    if ((username === 'admin' && password === 'admin') || 
        (username === 'user' && password === 'user')) {
      console.log(`Sérstök innskráning fyrir ${username}`);
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );
      
      return res.json({ token });
    }

    // Bera saman lykilorð með bcrypt
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Error during login:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Sækja upplýsingar um innskráðan notanda - get current user
router.get('/me', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, role FROM h1todo.users WHERE id = $1',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sækja fjölda notenda - get user count
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM h1todo.users');
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
