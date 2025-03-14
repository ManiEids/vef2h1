import { faker } from '@faker-js/faker/locale/is';
import bcrypt from 'bcrypt';
import { pool } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const PASSWORD_HASH = '$2b$10$7TxahHgzQi2MvV5ktj5qkO7PQPkJImjcKuIci96bA2pZVC4CsvKju'; // 'admin'

async function seed() {
  console.log('Starting seed...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create users (10 users + admin)
    console.log('Creating users...');
    const users = [];
    for (let i = 0; i < 10; i++) {
      const firstName = faker.person.firstName();
      const username = faker.internet.userName({ firstName }).toLowerCase();
      
      const { rows } = await client.query(
        `INSERT INTO h1todo.users (username, password_hash, email, role) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [username, PASSWORD_HASH, faker.internet.email({ firstName }), 'user']
      );
      
      users.push(rows[0].id);
    }

    // Create additional categories (5 existing + 5 new = 10)
    console.log('Creating categories...');
    const categories = [];
    for (let i = 0; i < 5; i++) {
      const userId = users[Math.floor(Math.random() * users.length)];
      const { rows } = await client.query(
        `INSERT INTO h1todo.categories (name, description, color, user_id) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          faker.word.sample() + ' ' + faker.word.sample(),
          faker.lorem.sentence(),
          faker.internet.color(),
          userId
        ]
      );
      categories.push(rows[0].id);
    }

    // Get existing category IDs
    const { rows: existingCategories } = await client.query(
      'SELECT id FROM h1todo.categories LIMIT 5'
    );
    existingCategories.forEach(cat => categories.push(cat.id));

    // Create additional tags (5 existing + 5 new = 10)
    console.log('Creating tags...');
    const tags = [];
    for (let i = 0; i < 5; i++) {
      const userId = users[Math.floor(Math.random() * users.length)];
      const { rows } = await client.query(
        `INSERT INTO h1todo.tags (name, color, user_id) 
         VALUES ($1, $2, $3) RETURNING id`,
        [
          faker.word.sample(),
          faker.internet.color(),
          userId
        ]
      );
      tags.push(rows[0].id);
    }

    // Get existing tag IDs
    const { rows: existingTags } = await client.query(
      'SELECT id FROM h1todo.tags LIMIT 5'
    );
    existingTags.forEach(tag => tags.push(tag.id));

    // Create tasks (35)
    console.log('Creating tasks...');
    const tasks = [];
    for (let i = 0; i < 35; i++) {
      const userId = users[Math.floor(Math.random() * users.length)];
      const categoryId = categories[Math.floor(Math.random() * categories.length)];
      
      const { rows } = await client.query(
        `INSERT INTO h1todo.tasks (title, description, completed, user_id, category_id, due_date, priority) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          faker.lorem.sentence(3),
          faker.lorem.paragraph(),
          faker.datatype.boolean(0.3), // 30% chance of being completed
          userId,
          categoryId,
          faker.date.future(),
          faker.number.int({ min: 1, max: 3 })
        ]
      );
      tasks.push(rows[0].id);
    }

    // Assign tags to tasks
    console.log('Assigning tags to tasks...');
    for (const taskId of tasks) {
      // Assign 1-3 random tags to each task
      const numTags = faker.number.int({ min: 1, max: 3 });
      const shuffled = [...tags].sort(() => 0.5 - Math.random());
      const selectedTags = shuffled.slice(0, numTags);
      
      for (const tagId of selectedTags) {
        await client.query(
          'INSERT INTO h1todo.task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [taskId, tagId]
        );
      }
    }

    // Create comments (50)
    console.log('Creating comments...');
    for (let i = 0; i < 50; i++) {
      const taskId = tasks[Math.floor(Math.random() * tasks.length)];
      const userId = users[Math.floor(Math.random() * users.length)];
      
      await client.query(
        `INSERT INTO h1todo.comments (task_id, user_id, content) 
         VALUES ($1, $2, $3)`,
        [
          taskId,
          userId,
          faker.lorem.paragraph()
        ]
      );
    }

    // Create task history entries (30)
    console.log('Creating task history...');
    for (let i = 0; i < 30; i++) {
      const taskId = tasks[Math.floor(Math.random() * tasks.length)];
      const userId = users[Math.floor(Math.random() * users.length)];
      const actions = ['created', 'updated', 'completed', 'reopened'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      await client.query(
        `INSERT INTO h1todo.task_history (task_id, user_id, action, details) 
         VALUES ($1, $2, $3, $4)`,
        [
          taskId,
          userId,
          action,
          JSON.stringify({ note: faker.lorem.sentence() })
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully!');
    
    // Count records in each table
    const counts = await countRecords(client);
    console.log('Record counts:', counts);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err);
  } finally {
    client.release();
  }
}

async function countRecords(client) {
  const tables = [
    'users', 'categories', 'tags', 'tasks', 
    'task_tags', 'task_history', 'comments', 'task_attachments'
  ];
  
  const counts = {};
  
  for (const table of tables) {
    const { rows } = await client.query(`SELECT COUNT(*) FROM h1todo.${table}`);
    counts[table] = parseInt(rows[0].count);
  }
  
  return counts;
}

seed()
  .then(() => {
    console.log('Seed complete, exiting...');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during seeding:', err);
    process.exit(1);
  });
