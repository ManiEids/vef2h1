import { pool } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'database.sql');

// Password hash for admin user (password: admin)
const ADMIN_HASH = '$2b$10$7TxahHgzQi2MvV5ktj5qkO7PQPkJImjcKuIci96bA2pZVC4CsvKju';

async function seedRender() {
  console.log('Starting Render database seed...');
  let client;

  try {
    // Read SQL file content
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Connect to database
    client = await pool.connect();
    
    // Create schema if not exists
    await client.query('CREATE SCHEMA IF NOT EXISTS h1todo');
    await client.query('SET search_path TO h1todo, public');
    
    try {
      // Execute schema
      console.log('Executing schema...');
      await client.query(schemaSql);
      console.log('Schema executed successfully');
      
      // Insert admin user if not exists
      await client.query(`
        INSERT INTO h1todo.users (username, password_hash, role, email)
        VALUES ('admin', $1, 'admin', 'admin@example.com')
        ON CONFLICT (username) DO NOTHING
      `, [ADMIN_HASH]);
      console.log('Admin user created or already exists');
      
      // Insert basic categories if not exist
      const categories = [
        ['Vinna', 'Work-related tasks', '#0275d8'],
        ['Persónulegt', 'Personal tasks', '#5cb85c'],
        ['Nám', 'Educational tasks', '#f0ad4e'],
        ['Heilsa', 'Health-related tasks', '#d9534f'],
        ['Heimili', 'House chores and maintenance', '#6c757d']
      ];
      
      for (const [name, description, color] of categories) {
        await client.query(`
          INSERT INTO h1todo.categories (name, description, color)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO NOTHING
        `, [name, description, color]);
      }
      console.log('Basic categories created');
      
      // Insert basic tags if not exist
      const tags = [
        ['Mikilvægt', '#dc3545'],
        ['Fundur', '#007bff'],
        ['Lágt forgangsstig', '#fd7e14'],
        ['Frestur', '#28a745'],
        ['Bíður', '#17a2b8']
      ];
      
      for (const [name, color] of tags) {
        await client.query(`
          INSERT INTO h1todo.tags (name, color)
          VALUES ($1, $2)
          ON CONFLICT (name) DO NOTHING
        `, [name, color]);
      }
      console.log('Basic tags created');
      
      // Create sample tasks if there are none
      const { rows: taskCount } = await client.query('SELECT COUNT(*) FROM h1todo.tasks');
      if (parseInt(taskCount[0].count) === 0) {
        await client.query(`
          INSERT INTO h1todo.tasks (title, description, user_id)
          VALUES 
            ('Læra JavaScript', 'Study JavaScript fundamentals', 1),
            ('Byggja verkefni', 'Create a basic todo application', 1),
            ('Setja upp á Render', 'Deploy the todo application to Render', 1)
        `);
        console.log('Sample tasks created');
      }
      
      console.log('Database seeded successfully for Render deployment!');
    } catch (err) {
      console.error('Error executing schema or seed data:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error during Render seed:', error);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
}

// Run the seed
seedRender()
  .then(() => {
    console.log('Render seed script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Render seed failed:', err);
    process.exit(1);
  });
