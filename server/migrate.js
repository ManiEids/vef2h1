import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'database.sql');

async function migrate() {
  console.log('Starting database migration...');
  console.log(`Using schema file: ${schemaPath}`);
  
  try {
    // Read SQL file content
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Connect to database
    const client = await pool.connect();
    try {
      // Execute schema
      console.log('Executing schema...');
      await client.query(schemaSql);
      console.log('Schema executed successfully');
      
      // Verify tables exist
      console.log('Verifying tables...');
      const tables = ['users', 'tasks', 'categories', 'tags', 'task_tags',
                     'task_history', 'comments', 'task_attachments'];
      
      for (const table of tables) {
        const { rows } = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'h1todo' 
            AND table_name = $1
          );
        `, [table]);
        
        if (rows[0].exists) {
          console.log(`✓ Table ${table} exists`);
        } else {
          console.error(`✗ Table ${table} does not exist`);
        }
      }
      
      console.log('Migration complete!');
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrate()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
