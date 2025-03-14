import { pool } from './db.js';

// Password hash for 'admin' and 'user' passwords
const PASSWORD_HASH = '$2b$10$7TxahHgzQi2MvV5ktj5qkO7PQPkJImjcKuIci96bA2pZVC4CsvKju';

async function ensureUsers() {
  console.log('Ensuring default users exist...');
  const client = await pool.connect();

  try {
    // Create schema if it doesn't exist
    await client.query('CREATE SCHEMA IF NOT EXISTS h1todo');
    await client.query('SET search_path TO h1todo, public');
    
    // Check if users table exists, if not, this script can't proceed
    const { rows: tableExists } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'h1todo' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('Users table does not exist. Run migration first.');
      return;
    }
    
    // Add admin user if it doesn't exist
    await client.query(`
      INSERT INTO h1todo.users (username, password_hash, role, email)
      VALUES ('admin', $1, 'admin', 'admin@example.com')
      ON CONFLICT (username) DO NOTHING
    `, [PASSWORD_HASH]);
    
    // Add regular user if it doesn't exist
    await client.query(`
      INSERT INTO h1todo.users (username, password_hash, role, email)
      VALUES ('user', $1, 'user', 'user@example.com')
      ON CONFLICT (username) DO NOTHING
    `, [PASSWORD_HASH]);
    
    // Check users
    const { rows: users } = await client.query(`
      SELECT id, username, role FROM h1todo.users WHERE username IN ('admin', 'user')
    `);
    
    console.log('Users in database:', users);
    console.log('Default users created or already exist');
  } catch (err) {
    console.error('Error creating default users:', err);
  } finally {
    client.release();
  }
}

ensureUsers()
  .then(() => {
    console.log('Script complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
