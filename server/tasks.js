import express from 'express';
import { pool } from './db.js';
import { authRequired, adminRequired } from './middleware.js';
import { body, validationResult, param, query } from 'express-validator';
import fs from 'fs';

export const router = express.Router();

async function loadInitialTasks() {
  try {
    // Check if the tasks table exists
    try {
      await pool.query('SELECT 1 FROM h1todo.tasks LIMIT 1');
    } catch (tableErr) {
      // If the table doesn't exist, create it
      console.log('Tasks table does not exist, creating it...');
      // Execute the database.sql script to create the tables
      const fs = require('fs');
      const databaseSql = fs.readFileSync('database.sql').toString();
      await pool.query(databaseSql);
      console.log('Tasks table created successfully.');
    }

    const { rows } = await pool.query('SELECT COUNT(*) FROM h1todo.tasks');
    const taskCount = parseInt(rows[0].count, 10);

    if (taskCount === 0) {
      console.log('Loading initial tasks from data.json');
      const rawData = fs.readFileSync('public/data/data.json');
      const data = JSON.parse(rawData);

      if (data.tasks && Array.isArray(data.tasks)) {
        for (const task of data.tasks) {
          await pool.query(
            `INSERT INTO h1todo.tasks (title, description, user_id)
             VALUES ($1, $2, $3) RETURNING *`,
            [task.title, task.description, 1] // Assuming user_id 1 is admin
          );
        }
        console.log('Initial tasks loaded successfully');
      } else {
        console.warn('No tasks found in data.json');
      }
    } else {
      console.log('Tasks already exist in the database');
    }
  } catch (err) {
    console.error('Error loading initial tasks:', err);
  }
}

loadInitialTasks();

// Sækja verkefni með síðuskiptingu
router.get(
  '/',
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM tasks ORDER BY id DESC'
      );

      res.json({
        tasks: rows,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Sækja eitt verkefni eftir auðkenni
router.get(
  '/:id',
  [param('id').isInt().toInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    try {
      const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Búa til nýtt verkefni (krefst innskráningar)
router.post(
  '/',
  authRequired,
  [
    body('title').isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
    body('description').optional().isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description } = req.body;

    try {
      const { rows } = await pool.query(
        `INSERT INTO tasks (title, description, user_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [title, description, req.user.userId]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Uppfæra verkefni (aðeins stjórnandi)
router.put(
  '/:id',
  authRequired,
  adminRequired,
  [
    param('id').isInt().toInt(),
    body('title').optional().isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
    body('description').optional().isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters'),
    body('completed').optional().isBoolean().toBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, completed } = req.body;

    try {
      const { rows } = await pool.query(
        `UPDATE tasks
         SET title=$1, description=$2, completed=$3, updated_at=NOW()
         WHERE id=$4 RETURNING *`,
        [title, description, completed, id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Eyða verkefni (aðeins stjórnandi)
router.delete(
  '/:id',
  authRequired,
  adminRequired,
  [param('id').isInt().toInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    try {
      const { rowCount } = await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ message: 'Task deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);
