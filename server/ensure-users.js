// Tryggja að notendur séu til - Ensure default users exist
import { pool } from './db.js';

// Password hash fyrir 'admin' og 'user' passwords (bæði er 'admin')
const PASSWORD_HASH = '$2b$10$7TxahHgzQi2MvV5ktj5qkO7PQPkJImjcKuIci96bA2pZVC4CsvKju';

async function ensureUsers() {
  console.log('Tryggja að sjálfgefnir notendur séu til...');
  const client = await pool.connect();

  try {
    // Búa til schema ef það er ekki til
    await client.query('CREATE SCHEMA IF NOT EXISTS h1todo');
    await client.query('SET search_path TO h1todo, public');
    
    // Athuga hvort users tafla er til
    const { rows: tableExists } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'h1todo' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('Users tafla er ekki til. Keyrðu migrate fyrst.');
      return;
    }
    
    // Bæta við admin notanda ef hann er ekki til
    await client.query(`
      INSERT INTO h1todo.users (username, password_hash, role, email)
      VALUES ('admin', $1, 'admin', 'admin@example.com')
      ON CONFLICT (username) DO NOTHING
    `, [PASSWORD_HASH]);
    
    // Bæta við venjulegum notanda ef hann er ekki til
    await client.query(`
      INSERT INTO h1todo.users (username, password_hash, role, email)
      VALUES ('user', $1, 'user', 'user@example.com')
      ON CONFLICT (username) DO NOTHING
    `, [PASSWORD_HASH]);
    
    // Athuga hverjir eru til
    const { rows: users } = await client.query(`
      SELECT id, username, role FROM h1todo.users WHERE username IN ('admin', 'user')
    `);
    
    console.log('Notendur í gagnagrunni:', users);
    console.log('Sjálfgefnir notendur búnir til eða eru nú þegar til');
  } catch (err) {
    console.error('Villa við að búa til sjálfgefna notendur:', err);
  } finally {
    client.release();
  }
}

// Keyra fallið
ensureUsers()
  .then(() => {
    console.log('Script lokið');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
