import express from 'express';
import { pool } from './db.js';
import { authRequired, adminRequired } from './middleware.js';
import { body, validationResult, param, query } from 'express-validator';

export const router = express.Router();

// GET /tasks (with pagination)
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt().default(10),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page;
    const limit = req.query.limit;
    const offset = (page - 1) * limit;

    try {
      const { rows, rowCount } = await pool.query(
        'SELECT * FROM tasks ORDER BY id DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      const totalPages = Math.ceil(rowCount / limit);

      res.json({
        tasks: rows,
        page,
        limit,
        totalPages,
        totalTasks: rowCount,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /tasks/:id
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

// POST /tasks (requires auth)
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

// PUT /tasks/:id (admin only)
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

// DELETE /tasks/:id (admin only)
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
