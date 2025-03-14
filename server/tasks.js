import express from 'express';
import { pool } from './db.js';
import { authRequired, adminRequired } from './middleware.js';
import { body, validationResult, param, query } from 'express-validator';

export const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, 
             c.name AS category_name,
             c.color AS category_color
      FROM h1todo.tasks t
      LEFT JOIN h1todo.categories c ON t.category_id = c.id
      ORDER BY t.id DESC
    `);

    const taskIds = rows.map(task => task.id);

    if (taskIds.length > 0) {
      const { rows: tagRows } = await pool.query(`
        SELECT tt.task_id, t.id, t.name, t.color
        FROM h1todo.task_tags tt
        JOIN h1todo.tags t ON tt.tag_id = t.id
        WHERE tt.task_id = ANY($1)
      `, [taskIds]);

      const taskTags = {};
      tagRows.forEach(tag => {
        if (!taskTags[tag.task_id]) {
          taskTags[tag.task_id] = [];
        }
        taskTags[tag.task_id].push({
          id: tag.id,
          name: tag.name,
          color: tag.color
        });
      });

      rows.forEach(task => {
        task.tags = taskTags[task.id] || [];
      });
    }

    res.json({
      tasks: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', [param('id').isInt().toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const { rows } = await pool.query(`
      SELECT t.*, 
             c.name AS category_name,
             c.color AS category_color
      FROM h1todo.tasks t
      LEFT JOIN h1todo.categories c ON t.category_id = c.id
      WHERE t.id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = rows[0];

    const { rows: tagRows } = await pool.query(`
      SELECT t.id, t.name, t.color
      FROM h1todo.task_tags tt
      JOIN h1todo.tags t ON tt.tag_id = t.id
      WHERE tt.task_id = $1
    `, [id]);

    task.tags = tagRows;

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authRequired, [
  body('title').isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  body('description').optional().isLength({ max: 255 }),
  body('priority').optional().isInt({ min: 1, max: 3 }).withMessage('Priority must be between 1 and 3'),
  body('due_date').optional().isISO8601().withMessage('Due date must be a valid date'),
  body('category_id').optional().isInt(),
  body('tags').optional().isArray(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, priority, due_date, category_id, tags } = req.body;

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { rows } = await client.query(
        `INSERT INTO h1todo.tasks 
         (title, description, user_id, priority, due_date, category_id)
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [title, description, req.user.userId, priority || 2, due_date, category_id]
      );
      
      const taskId = rows[0].id;
      
      if (tags && tags.length > 0) {
        for (const tagId of tags) {
          await client.query(
            'INSERT INTO h1todo.task_tags (task_id, tag_id) VALUES ($1, $2)',
            [taskId, tagId]
          );
        }
      }
      
      await client.query('COMMIT');
      
      const taskWithTags = await getTaskWithTags(taskId);
      res.status(201).json(taskWithTags);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authRequired, [
  param('id').isInt().toInt(),
  body('title').optional().isLength({ min: 3 }),
  body('description').optional().isLength({ max: 255 }),
  body('completed').optional().isBoolean().toBoolean(),
  body('priority').optional().isInt({ min: 1, max: 3 }),
  body('due_date').optional().isISO8601(),
  body('category_id').optional().isInt(),
  body('tags').optional().isArray(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { title, description, completed, priority, due_date, category_id, tags } = req.body;

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const taskCheck = await client.query('SELECT user_id FROM h1todo.tasks WHERE id = $1', [id]);
      
      if (taskCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      if (taskCheck.rows[0].user_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to update this task' });
      }
      
      const fieldsToUpdate = [];
      const values = [];
      let paramCount = 1;
      
      if (title !== undefined) {
        fieldsToUpdate.push(`title = $${paramCount++}`);
        values.push(title);
      }
      
      if (description !== undefined) {
        fieldsToUpdate.push(`description = $${paramCount++}`);
        values.push(description);
      }
      
      if (completed !== undefined) {
        fieldsToUpdate.push(`completed = $${paramCount++}`);
        values.push(completed);
      }
      
      if (priority !== undefined) {
        fieldsToUpdate.push(`priority = $${paramCount++}`);
        values.push(priority);
      }
      
      if (due_date !== undefined) {
        fieldsToUpdate.push(`due_date = $${paramCount++}`);
        values.push(due_date);
      }
      
      if (category_id !== undefined) {
        fieldsToUpdate.push(`category_id = $${paramCount++}`);
        values.push(category_id);
      }
      
      fieldsToUpdate.push(`updated_at = NOW()`);
      
      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      values.push(id);
      
      const { rows } = await client.query(
        `UPDATE h1todo.tasks
         SET ${fieldsToUpdate.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );
      
      if (tags !== undefined) {
        await client.query('DELETE FROM h1todo.task_tags WHERE task_id = $1', [id]);
        
        if (tags.length > 0) {
          for (const tagId of tags) {
            await client.query(
              'INSERT INTO h1todo.task_tags (task_id, tag_id) VALUES ($1, $2)',
              [id, tagId]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
      const taskWithTags = await getTaskWithTags(id);
      res.json(taskWithTags);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authRequired, [param('id').isInt().toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  try {
    const taskCheck = await pool.query('SELECT user_id FROM h1todo.tasks WHERE id = $1', [id]);
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (taskCheck.rows[0].user_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this task' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM h1todo.task_tags WHERE task_id = $1', [id]);
      await client.query('DELETE FROM h1todo.tasks WHERE id = $1', [id]);
      await client.query('COMMIT');
      
      res.json({ message: 'Task deleted' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function getTaskWithTags(taskId) {
  const { rows } = await pool.query(`
    SELECT t.*, 
           c.name AS category_name,
           c.color AS category_color
    FROM h1todo.tasks t
    LEFT JOIN h1todo.categories c ON t.category_id = c.id
    WHERE t.id = $1
  `, [taskId]);
  
  if (rows.length === 0) {
    return null;
  }
  
  const task = rows[0];
  
  const { rows: tagRows } = await pool.query(`
    SELECT t.id, t.name, t.color
    FROM h1todo.task_tags tt
    JOIN h1todo.tags t ON tt.tag_id = t.id
    WHERE tt.task_id = $1
  `, [taskId]);
  
  task.tags = tagRows;
  
  return task;
}

// Category endpoints
router.get('/categories/all', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM h1todo.categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Tags endpoints
router.get('/tags/all', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM h1todo.tags ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
