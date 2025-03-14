// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router as tasksRouter } from './tasks.js';
import { router as authRouter } from './auth.js';
import { router as uploadRouter } from './upload.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // parse JSON bodies

// Simple route for sanity check
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from minimal API',
    routes: {
      tasks: '/tasks',
      auth: '/auth',
      upload: '/upload',
      // Add other routes as you create them
    },
  });
});

// Attach routes
app.use('/tasks', tasksRouter);
app.use('/auth', authRouter);
app.use('/upload', uploadRouter);

// 404 Route
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
