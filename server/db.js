// server/db.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Stilla tengingu við gagnagrunn
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Ef verið að nota á staðbundinn þróunarvél
};

// Stilla SSL fyrir framleiðsluumhverfi
if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Nauðsynlegt fyrir Render
  };
}

export const pool = new Pool(poolConfig);

// Set the search path
pool.query('SET search_path TO h1todo, public;')
  .then(() => {
    console.log('Search path set to h1todo, public');
  })
  .catch((err) => {
    console.error('Error setting search path:', err);
  });
