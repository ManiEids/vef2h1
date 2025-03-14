import express from 'express';
import { pool } from './db.js';
import { authRequired, adminRequired } from './middleware.js';
import { body, validationResult, param, query } from 'express-validator';

export const router = express.Router();

// Sækja öll verkefni með pagination og filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  query('completed').optional().isBoolean().toBoolean(),
  query('category').optional().isInt().toInt(),
  query('tag').optional().isInt().toInt(),
  query('search').optional().isString().trim(),
  query('sort').optional().isIn(['newest', 'oldest', 'priority', 'dueDate']).trim()
], async (req, res) => {
  // Validation check - skoða errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const offset = (page - 1) * limit; // Reikna offset fyrir SQL

  try {
    console.log('GET /tasks - Sæki verkefni');
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'er til' : 'vantar!'}`);
    
    // Build query conditions - Búa til skilyrði fyrir fyrirspurn
    let conditions = [];
    let params = [];
    let paramCounter = 1;

    // Filter eftir completion status
    if (req.query.completed !== undefined) {
      conditions.push(`t.completed = $${paramCounter++}`);
      params.push(req.query.completed);
    }

    // Filter by category
    if (req.query.category) {
      conditions.push(`t.category_id = $${paramCounter++}`);
      params.push(req.query.category);
    }

    // Filter by tag
    if (req.query.tag) {
      conditions.push(`EXISTS (
        SELECT 1 FROM h1todo.task_tags tt 
        WHERE tt.task_id = t.id AND tt.tag_id = $${paramCounter++}
      )`);
      params.push(req.query.tag);
    }

    // Filter by search term
    if (req.query.search) {
      conditions.push(`(
        t.title ILIKE $${paramCounter++} OR 
        t.description ILIKE $${paramCounter++}
      )`);
      const searchPattern = `%${req.query.search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Combine conditions
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Handle sorting
    let orderBy = 't.created_at DESC'; // default sort
    if (req.query.sort) {
      switch(req.query.sort) {
        case 'newest':
          orderBy = 't.created_at DESC';
          break;
        case 'oldest':
          orderBy = 't.created_at ASC';
          break;
        case 'priority':
          orderBy = 't.priority ASC, t.created_at DESC';
          break;
        case 'dueDate':
          orderBy = 't.due_date ASC NULLS LAST, t.created_at DESC';
          break;
      }
    }

    // Sækja fjölda verkefna fyrir pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM h1todo.tasks t
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    // Sækja verkefni með grunnupplýsingum
    const tasksQuery = `
      SELECT t.*, c.name AS category_name
      FROM h1todo.tasks t
      LEFT JOIN h1todo.categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    params.push(limit, offset);
    
    // Log the query we're about to run
    console.log('Running query with params:', params);
    console.log('Query:', tasksQuery.replace(/\s+/g, ' '));
    
    const { rows: tasks } = await pool.query(tasksQuery, params);
    console.log(`Retrieved ${tasks.length} tasks from database`);

    // Get task IDs for fetching related data
    const taskIds = tasks.map(task => task.id);

    if (taskIds.length > 0) {
      // Get tags for each task
      const { rows: tagData } = await pool.query(`
        SELECT tt.task_id, t.id AS tag_id, t.name AS tag_name, t.color
        FROM h1todo.task_tags tt
        JOIN h1todo.tags t ON tt.tag_id = t.id
        WHERE tt.task_id = ANY($1)
      `, [taskIds]);

      // Associate tags with tasks
      const taskTags = {};
      tagData.forEach(item => {
        if (!taskTags[item.task_id]) {
          taskTags[item.task_id] = [];
        }
        taskTags[item.task_id].push({
          id: item.tag_id,
          name: item.tag_name,
          color: item.color
        });
      });

      // Tengja tags við verkefni
      tasks.forEach(task => {
        task.tags = taskTags[task.id] || [];
      });

      // Check for uploads table
      try {
        // Get uploads/attachments for each task (if uploads table exists)
        const { rows: uploads } = await pool.query(`
          SELECT task_id, url as file_url
          FROM h1todo.uploads
          WHERE task_id = ANY($1)
        `, [taskIds]);

        // Associate uploads with tasks
        uploads.forEach(upload => {
          const task = tasks.find(t => t.id === upload.task_id);
          if (task) {
            task.image_url = upload.file_url; // Use first image as main image
          }
        });
      } catch (err) {
        console.log('Uploads table might not exist or another issue:', err.message);
      }
    }

    res.json({
      tasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Sækja eitt verkefni eftir ID
router.get('/:id', [param('id').isInt().toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;

  try {
    // Get task with basic details
    const { rows: tasks } = await pool.query(`
      SELECT t.*, c.name AS category_name
      FROM h1todo.tasks t
      LEFT JOIN h1todo.categories c ON t.category_id = c.id
      WHERE t.id = $1
    `, [id]);

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];

    // Get tags for the task
    const { rows: tagData } = await pool.query(`
      SELECT t.id AS tag_id, t.name AS tag_name
      FROM h1todo.task_tags tt
      JOIN h1todo.tags t ON tt.tag_id = t.id
      WHERE tt.task_id = $1
    `, [id]);

    task.tags = tagData.map(tag => ({
      id: tag.tag_id,
      name: tag.tag_name
    }));

    // Get uploads for the task
    const { rows: uploads } = await pool.query(`
      SELECT id, url as file_url
      FROM h1todo.uploads
      WHERE task_id = $1
    `, [id]);

    if (uploads.length > 0) {
      task.image_url = uploads[0].file_url; // Use first image as main image
    }
    
    task.attachments = uploads;

    res.json(task);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Búa til nýtt verkefni - þarf að vera innskráður
router.post('/', authRequired, [
  body('title').isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  body('description').optional().isString(),
  body('priority').optional().isInt({ min: 1, max: 3 }),
  body('due_date').optional().isISO8601().withMessage('Due date must be a valid date'),
  body('category_id').optional().isInt(),
  body('tags').optional().isArray()
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
      
      // Create the task with the fields that definitely exist in the schema
      const { rows } = await client.query(
        `INSERT INTO h1todo.tasks 
         (title, description, user_id, priority, due_date, category_id)
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [title, description, req.user.userId, priority || 2, due_date || null, category_id || null]
      );
      
      const taskId = rows[0].id;
      
      // Add tags if provided and if the task_tags table exists
      if (tags && tags.length > 0) {
        try {
          for (const tagId of tags) {
            await client.query(
              'INSERT INTO h1todo.task_tags (task_id, tag_id) VALUES ($1, $2)',
              [taskId, tagId]
            );
          }
        } catch (err) {
          console.log('Could not insert tags - table might not exist:', err.message);
        }
      }
      
      await client.query('COMMIT');
      
      res.status(201).json(rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Uppfæra verkefni - þarf að vera innskráður + vera eigandi
router.put('/:id', authRequired, [
  param('id').isInt().toInt(),
  body('title').optional().isLength({ min: 3 }),
  body('description').optional().isString(),
  body('completed').optional().isBoolean(),
  body('priority').optional().isInt({ min: 1, max: 3 }),
  body('due_date').optional().isISO8601(),
  body('category_id').optional().isInt(),
  body('tags').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { title, description, completed, priority, due_date, category_id, tags } = req.body;

  try {
    // Verify task exists and user has permission
    const taskCheck = await pool.query('SELECT user_id FROM h1todo.tasks WHERE id = $1', [id]);
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (taskCheck.rows[0].user_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Prepare dynamic updates
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      
      if (completed !== undefined) {
        updates.push(`completed = $${paramCount++}`);
        values.push(completed);
      }
      
      if (priority !== undefined) {
        updates.push(`priority = $${paramCount++}`);
        values.push(priority);
      }
      
      if (due_date !== undefined) {
        updates.push(`due_date = $${paramCount++}`);
        values.push(due_date);
      }
      
      if (category_id !== undefined) {
        updates.push(`category_id = $${paramCount++}`);
        values.push(category_id);
      }
      
      updates.push(`updated_at = NOW()`);
      
      // Add task ID to values
      values.push(id);
      
      if (updates.length > 0) {
        await client.query(
          `UPDATE h1todo.tasks 
           SET ${updates.join(', ')}
           WHERE id = $${paramCount}`,
          values
        );
      }
      
      // Update tags if provided
      if (tags !== undefined) {
        // Remove existing tags
        await client.query('DELETE FROM h1todo.task_tags WHERE task_id = $1', [id]);
        
        // Add new tags
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
      
      const updatedTask = await getTaskWithRelations(id);
      res.json(updatedTask);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Eyða verkefni - þarf að vera innskráður + eigandi eða admin
router.delete('/:id', authRequired, [param('id').isInt().toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  
  try {
    console.log(`DELETE /tasks/${id} - User ${req.user.userId} attempting to delete task`);
    
    // Verify task exists and user has permission
    const taskCheck = await pool.query('SELECT user_id FROM h1todo.tasks WHERE id = $1', [id]);
    console.log('Task check result:', taskCheck.rows);
    
    if (taskCheck.rows.length === 0) {
      console.log(`Task ${id} not found`);
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (taskCheck.rows[0].user_id !== req.user.userId && req.user.role !== 'admin') {
      console.log(`Permission denied: Task owner is ${taskCheck.rows[0].user_id}, requester is ${req.user.userId} with role ${req.user.role}`);
      return res.status(403).json({ error: 'Permission denied' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete related records first
      await client.query('DELETE FROM h1todo.task_tags WHERE task_id = $1', [id]);
      await client.query('DELETE FROM h1todo.uploads WHERE task_id = $1', [id]);
      
      // Then delete the task
      await client.query('DELETE FROM h1todo.tasks WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      console.log(`Task ${id} deleted successfully`);
      res.json({ message: 'Task deleted successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Error deleting task ${id}:`, err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Sækja alla flokka - allir geta sótt
router.get('/categories/all', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, description, created_at 
      FROM h1todo.categories 
      ORDER BY name
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sækja öll tags - allir geta sótt
router.get('/tags/all', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, created_at
      FROM h1todo.tags
      ORDER BY name
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Hjálparfall til að sækja verkefni með öllum tengdum gögnum
async function getTaskWithRelations(taskId) {
  // Sæki verkefni með grunnupplýsingum
  const { rows: tasks } = await pool.query(`
    SELECT t.*, c.name AS category_name
    FROM h1todo.tasks t
    LEFT JOIN h1todo.categories c ON t.category_id = c.id
    WHERE t.id = $1
  `, [taskId]);
  
  if (tasks.length === 0) {
    return null;
  }
  
  const task = tasks[0];
  
  // Get tags for the task
  const { rows: tagData } = await pool.query(`
    SELECT t.id AS tag_id, t.name AS tag_name
    FROM h1todo.task_tags tt
    JOIN h1todo.tags t ON tt.tag_id = t.id
    WHERE tt.task_id = $1
  `, [taskId]);
  
  task.tags = tagData.map(tag => ({
    id: tag.tag_id,
    name: tag.tag_name
  }));
  
  // Get uploads for the task
  const { rows: uploads } = await pool.query(`
    SELECT id, url as file_url
    FROM h1todo.uploads
    WHERE task_id = $1
  `, [taskId]);
  
  if (uploads.length > 0) {
    task.image_url = uploads[0].file_url; // Use first image as main
  }
  
  task.attachments = uploads;
  
  return task;
}

export default router;
