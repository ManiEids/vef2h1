// server/db.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

console.log('Database URL:', process.env.DATABASE_URL ? 'is set' : 'is not set');

// Stilla tengingu við gagnagrunn
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Stilla SSL fyrir framleiðsluumhverfi
if (process.env.NODE_ENV === 'production') {
  console.log('Configuring SSL for production');
  poolConfig.ssl = {
    rejectUnauthorized: false, // Nauðsynlegt fyrir Render
  };
}

export const pool = new Pool(poolConfig);

// Log when pool creates a connection
pool.on('connect', (client) => {
  console.log('New database connection established');
  // Set the search path for this connection
  client.query('SET search_path TO h1todo, public')
    .then(() => console.log('Search path set for new connection'))
    .catch((err) => console.error('Error setting search path:', err));
});

// Log connection errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(res => {
    console.log('Database connected successfully, time:', res.rows[0].now);
    
    // Set the search path for all future connections
    return pool.query('SET search_path TO h1todo, public');
  })
  .then(() => {
    console.log('Default search path set to h1todo, public');
  })
  .catch(err => {
    console.error('Error connecting to database:', err);
  });
