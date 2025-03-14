// Main server file - Aðalskrá fyrir vefþjónn
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as tasksRouter } from './tasks.js';
import { router as authRouter } from './auth.js';
import { router as uploadRouter } from './upload.js'; 
import { pool, dbReady } from './db.js';

dotenv.config();

// Setja upp slóðir fyrir static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');

const app = express();

// CORS stillingar - mikilvægt fyrir öryggi
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://vef2hop1manisolo.onrender.com', 'http://localhost:3000'] 
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // parse JSON bodies - þýða JSON body

// Öryggis headers - security stuff
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-XSS-Protection', '1; mode=block');
  next();
});

// Þjóna static skrám úr public möppu
app.use(express.static(publicPath));

// API routes - vefþjónustur
app.get('/api', (req, res) => {
  res.json({
    message: 'Verkefnalisti Mána API',
    routes: {
      tasks: '/tasks',
      auth: '/auth',
      upload: '/upload',
    },
  });
});

// Database status endpoint - Gagnagrunns-status
app.get('/api/db-status', async (req, res) => {
  try {
    // Test database connection - Tékka á gagnagrunns-tengingu
    const connectionTest = await pool.query('SELECT NOW() as now');
    
    // Nota núverandi schema struktur til að telja færslur
    const usersResult = await pool.query('SELECT COUNT(*) FROM h1todo.users');
    const userCount = parseInt(usersResult.rows[0].count, 10);

    const tasksResult = await pool.query('SELECT COUNT(*) FROM h1todo.tasks');
    const taskCount = parseInt(tasksResult.rows[0].count, 10);

    const categoriesResult = await pool.query('SELECT COUNT(*) FROM h1todo.categories');
    const categoryCount = parseInt(categoriesResult.rows[0].count, 10);

    const tagsResult = await pool.query('SELECT COUNT(*) FROM h1todo.tags');
    const tagCount = parseInt(tagsResult.rows[0].count, 10);

    // Return status and counts
    res.json({
      connected: true,
      timestamp: connectionTest.rows[0].now,
      stats: {
        users: userCount,
        tasks: taskCount,
        categories: categoryCount,
        tags: tagCount
      }
    });
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({
      connected: false,
      error: err.message
    });
  }
});

// API leiðir - tengja við routers
app.use('/tasks', tasksRouter);
app.use('/auth', authRouter);
app.use('/upload', uploadRouter);

// 404 villa fyrir API leiðir
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// SPA route - fyrir framenda
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Global error handling - Almenn villumeðhöndlun
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Käyrä þjón - en bara ef gagnagrunnur er tengdur
const port = process.env.PORT || 3000;

// Bíða eftir að db sé ready áður en við startum server
dbReady.then(connected => {
  if (connected) {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Port explicitly set to: ${port}`);
      console.log(`Server listening at http://localhost:${port}`);
    });
  } else {
    console.error('Could not connect to database, server not started');
    process.exit(1);
  }
});

export { app }; // Export fyrir testing
