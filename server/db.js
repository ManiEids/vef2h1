// Gagnagrunnstengingar - Database connections
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';
console.log(`Umhverfi: ${isProduction ? 'production' : 'development'}`);
console.log('Database URL:', process.env.DATABASE_URL ? 'er stillt' : 'er ekki stillt');

// Stillingar fyrir PostgreSQL á Render
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  // Bæta við seiglu í tengingum
  max: 20,               // Hámarksfjöldi tenginga í pool
  idleTimeoutMillis: 30000, // Hversu lengi tenging má vera idle
  connectionTimeoutMillis: 10000, // Hversu lengi að bíða eftir tengingu
});

// Setja schema path fyrir hverja nýja tengingu
pool.on('connect', client => {
  client.query('SET search_path TO h1todo, public', (err) => {
    if (err) {
      console.error('Error setting search path:', err);
    } else {
      console.log('Schema path set to: h1todo, public');
    }
  });
  console.log('Ný gagnagrunnstenging stofnuð');
});

pool.on('error', (err, client) => {
  console.error('Villa á idle client:', err);
  // Reyna að tengjast aftur - mikilvægt fyrir langtíma notkun
  setTimeout(testConnection, 5000);
});

// Prófa gagnagrunntengingu við ræsingu
async function testConnection() {
  try {
    console.log('Prófa gagnagrunntengingu...');
    const res = await pool.query('SELECT NOW()');
    console.log('Database tengdur, tími:', res.rows[0].now);
    
    // Athuga hvort schema er til eða búa það til
    await pool.query('CREATE SCHEMA IF NOT EXISTS h1todo');
    await pool.query('SET search_path TO h1todo, public');
    console.log('Schema h1todo staðfest/búið til');
    
    // Athuga hvort uploads tafla er til
    try {
      await pool.query(`
        SELECT * FROM information_schema.tables
        WHERE table_schema = 'h1todo' AND table_name = 'uploads'
      `);
    } catch (err) {
      console.log('Uploads taflan er ekki til, nota task_attachments í staðinn');
    }
    
    return true;
  } catch (err) {
    console.error('Database tengivilla:', err);
    return false;
  }
}

// Export connection test til nota í öðrum modules
export const dbReady = testConnection();
