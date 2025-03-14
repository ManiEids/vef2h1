// server/db.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If using local dev, you might need host, port, user, etc.
  // ssl: { rejectUnauthorized: false }, // For certain hosting providers
});
