// server/db.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // If using local dev, you might need host, port, user, etc.
  // ssl: { rejectUnauthorized: false }, // For certain hosting providers - REMOVE FOR PRODUCTION
};

if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Required for Render
  };
}

export const pool = new Pool(poolConfig);
