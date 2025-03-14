import express from 'express';
import { pool } from './db.js';
import { authRequired, adminRequired } from './middleware.js';

export const router = express.Router();

// GET /tasks
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tasks (requires auth)
router.post('/', authRequired, async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, user_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [title, description, req.user.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /tasks/:id (admin only)
router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tasks
       SET title=$1, description=$2, completed=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [title, description, completed, id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /tasks/:id (admin only)
router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
