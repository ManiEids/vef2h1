import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authRequired } from './middleware.js';
import { uploadImage } from './cloudinary.js';
import { pool } from './db.js';

export const router = express.Router();

// Configure multer for file uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'temp-uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filter to only accept images
const fileFilter = (req, file, cb) => {
  // Accept only jpg/jpeg and png
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only JPG and PNG are allowed.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload image and save to Cloudinary
router.post('/', authRequired, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadImage(req.file.path);
    
    // Save file info to database - using the existing uploads table
    const { rows } = await pool.query(
      `INSERT INTO h1todo.uploads (url, task_id)
       VALUES ($1, $2)
       RETURNING id, url`,
      [
        cloudinaryResult.url,
        req.body.taskId || null
      ]
    );
    
    // Delete the temp file
    fs.unlinkSync(req.file.path);
    
    // Return success with file URL
    res.status(201).json({
      message: 'File uploaded successfully',
      fileId: rows[0].id,
      fileUrl: rows[0].url
    });
  } catch (error) {
    console.error('Error in file upload:', error);
    
    // Delete the temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Failed to process file upload',
      details: error.message
    });
  }
});

// Get attachments for a task
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const { rows } = await pool.query(
      `SELECT id, url, created_at
       FROM h1todo.uploads
       WHERE task_id = $1
       ORDER BY created_at DESC`,
      [taskId]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching task uploads:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete an attachment
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if upload exists
    const { rows } = await pool.query(
      `SELECT u.*, t.user_id AS task_owner
       FROM h1todo.uploads u
       LEFT JOIN h1todo.tasks t ON u.task_id = t.id
       WHERE u.id = $1`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    
    const upload = rows[0];
    
    // Check permission (admin or task owner)
    if (upload.task_owner !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Delete from database
    await pool.query('DELETE FROM h1todo.uploads WHERE id = $1', [id]);
    
    res.json({ message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
