import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';
console.log('Database URL:', process.env.DATABASE_URL ? 'is set' : 'is not set');

// SSL configuration for production
const ssl = isProduction ? {
  rejectUnauthorized: false
} : false;

console.log(`Configuring SSL for ${isProduction ? 'production' : 'development'}`);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('connect', client => {
  client.query('SET search_path TO h1todo, public', (err) => {
    if (err) {
      console.error('Error setting search path:', err);
    } else {
      console.log('Default search path set to h1todo, public');
    }
  });
  console.log('New database connection established');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test database connection on startup
pool.query('SELECT NOW()')
  .then(res => {
    console.log('Database connected successfully, time:', res.rows[0].now);
    return pool.query('SET search_path TO h1todo, public');
  })
  .then(() => {
    console.log('Default search path set to h1todo, public');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });
