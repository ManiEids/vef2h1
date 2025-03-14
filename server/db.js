import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';
console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
console.log('Database URL:', process.env.DATABASE_URL ? 'is set' : 'is not set');

// Production settings for Render's PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  // Add some connection resilience
  max: 20,               // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 10000, // How long to wait for a connection
});

// Set schema path for every new connection
pool.on('connect', client => {
  client.query('SET search_path TO h1todo, public', (err) => {
    if (err) {
      console.error('Error setting search path:', err);
    } else {
      console.log('Schema path set to: h1todo, public');
    }
  });
  console.log('New database connection established');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Try to reconnect - important for long-running services
  setTimeout(testConnection, 5000);
});

// Test database connection on startup
async function testConnection() {
  try {
    console.log('Testing database connection...');
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected successfully, time:', res.rows[0].now);
    
    // Verify schema exists or create it
    await pool.query('CREATE SCHEMA IF NOT EXISTS h1todo');
    await pool.query('SET search_path TO h1todo, public');
    console.log('Schema h1todo verified/created');
    
    // Check for uploads table - it might be missing in the existing schema
    try {
      await pool.query(`
        SELECT * FROM information_schema.tables
        WHERE table_schema = 'h1todo' AND table_name = 'uploads'
      `);
    } catch (err) {
      console.log('Uploads table might not exist, will attempt to use task_attachments instead');
    }
    
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}

// Export the connection test so it can be used by other modules
export const dbReady = testConnection();
