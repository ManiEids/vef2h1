// Mynda uploadari - Handles file uploads
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authRequired } from './middleware.js';
import { uploadImage } from './cloudinary.js';
import { pool } from './db.js';

export const router = express.Router();

// Stilla multer fyrir file uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'temp-uploads');

// Búa til uploads directory ef það er ekki til
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Stilla multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Búa til einkvæmt filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filter, bara myndir leyfðar
const fileFilter = (req, file, cb) => {
  // Bara JPG og PNG eru leyfð
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only JPG and PNG are allowed.'), false);
  }
};

// Multer með stærðartakmörkunum
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Bara ein mynd í einu
  }
});

// Hlaða upp mynd og vista á Cloudinary
router.post('/', authRequired, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Vinna með file upload:', req.file.originalname, `(${req.file.size} bytes)`);
    
    // Athuga stærð aftur, max 10MB
    if (req.file.size > 10 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File too large. Maximum file size is 10MB.' });
    }
    
    // Upload á Cloudinary með resize
    const cloudinaryResult = await uploadImage(req.file.path);
    console.log('Mynd hlaðið upp á Cloudinary:', cloudinaryResult.url);
    console.log(`Resized to ${cloudinaryResult.width}x${cloudinaryResult.height}, format: ${cloudinaryResult.format}, size: ${cloudinaryResult.bytes} bytes`);
    
    // Vista upplýsingar í gagnagrunn
    let fileId, fileUrl;
    try {
      // First try with uploads table (existing schema)
      const { rows } = await pool.query(
        `INSERT INTO h1todo.uploads (url, task_id)
         VALUES ($1, $2)
         RETURNING id, url`,
        [
          cloudinaryResult.url,
          req.body.taskId || null
        ]
      );
      
      fileId = rows[0].id;
      fileUrl = rows[0].url;
      console.log('File info saved to uploads table');
    } catch (err) {
      console.error('Error saving to uploads table, trying task_attachments:', err);
      
      // Try with task_attachments table (new schema)
      try {
        const { rows } = await pool.query(
          `INSERT INTO h1todo.task_attachments (
            file_url, task_id, file_type, file_name, file_size, width, height, user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, file_url`,
          [
            cloudinaryResult.url,
            req.body.taskId || null,
            req.file.mimetype,
            req.file.originalname,
            cloudinaryResult.bytes || req.file.size,
            cloudinaryResult.width || null,
            cloudinaryResult.height || null,
            req.user.userId
          ]
        );
        
        fileId = rows[0].id;
        fileUrl = rows[0].file_url;
        console.log('File info saved to task_attachments table');
      } catch (innerErr) {
        console.error('Error saving to task_attachments table too:', innerErr);
        throw new Error('Could not save file information to database');
      }
    }
    
    // Eyða temp skrá
    fs.unlinkSync(req.file.path);
    console.log('Temporary file deleted');
    
    // Skila árangri
    res.status(201).json({
      message: 'File uploaded successfully',
      fileId: fileId,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: cloudinaryResult.bytes || req.file.size,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height
    });
  } catch (error) {
    console.error('Error in file upload:', error);
    console.error('Stack trace:', error.stack);
    
    // Delete the temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Temporary file deleted after error');
    }
    
    res.status(500).json({
      error: 'Failed to process file upload',
      details: error.message
    });
  }
});

// Sækja attachments fyrir verkefni
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

// Eyða attachment
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
