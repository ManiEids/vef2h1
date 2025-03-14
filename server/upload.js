import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { authRequired } from './middleware.js';
import { pool } from './db.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: 'temp/' });
export const router = express.Router();

// POST /upload
router.post('/', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'minimal_todo_uploads',
    });
    // Optional: store result.url in DB
    const { rows } = await pool.query(
      `INSERT INTO uploads (url) VALUES ($1) RETURNING *`,
      [result.secure_url]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload error' });
  }
});
