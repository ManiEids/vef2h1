// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as tasksRouter } from './tasks.js';
import { router as authRouter } from './auth.js';
import { router as uploadRouter } from './upload.js';
import { pool } from './db.js'; // Import the database pool

dotenv.config();

// Setja upp slóðir fyrir static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');

const app = express();
app.use(cors());
app.use(express.json()); // parse JSON bodies

// Þjóna static skrám úr public möppu
app.use(express.static(publicPath));

// API leiðir
app.get('/api', (req, res) => {
  res.json({
    message: 'Hello from minimal API',
    routes: {
      tasks: '/tasks',
      auth: '/auth',
      upload: '/upload',
    },
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    // Test database connection
    const connectionTest = await pool.query('SELECT NOW() as now');

    // Get user count
    const usersResult = await pool.query('SELECT COUNT(*) FROM h1todo.users');
    const userCount = parseInt(usersResult.rows[0].count, 10);

    // Get tasks count
    const tasksResult = await pool.query('SELECT COUNT(*) FROM h1todo.tasks');
    const taskCount = parseInt(tasksResult.rows[0].count, 10);

    // Return status and counts
    res.json({
      connected: true,
      timestamp: connectionTest.rows[0].now,
      stats: {
        users: userCount,
        tasks: taskCount
      }
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.json({
      connected: false,
      error: err.message
    });
  }
});

// Tengja API leiðir við router
app.use('/tasks', tasksRouter);
app.use('/auth', authRouter);
app.use('/upload', uploadRouter);

// Beina öllum öðrum beiðnum á index.html (fyrir SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 404 villumeðhöndlun fyrir API leiðir
app.use('/api/*', (req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Almenn villumeðhöndlun
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Ræsa þjón
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
