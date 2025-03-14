import { pool } from './db.js';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

async function seedDatabase() {
  try {
    // 1. Create Admin User
    const password = 'adminpassword';
    const passwordHash = await bcrypt.hash(password, 10);

    const adminUser = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      ['admin', passwordHash, 'admin']
    );

    const adminId = adminUser.rows[0].id;

    // 2. Create Categories
    const categories = [];
    for (let i = 0; i < 5; i++) {
      const categoryName = faker.lorem.word();
      const categoryDescription = faker.lorem.sentence();
      const category = await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
        [categoryName, categoryDescription]
      );
      categories.push(category.rows[0]);
    }

    // 3. Create Tags
    const tags = [];
    for (let i = 0; i < 5; i++) {
      const tagName = faker.lorem.word();
      const tag = await pool.query(
        'INSERT INTO tags (name) VALUES ($1) RETURNING *',
        [tagName]
      );
      tags.push(tag.rows[0]);
    }

    // 4. Create Regular Users
    const users = [adminUser.rows[0]]; // Start with admin user
    for (let i = 0; i < 10; i++) {
      const username = faker.internet.userName();
      const password = faker.internet.password();
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
        [username, passwordHash, 'user']
      );
      users.push(user.rows[0]);
    }

    // 5. Create Tasks
    for (let i = 0; i < 50; i++) {
      const title = faker.lorem.sentence();
      const description = faker.lorem.paragraph();
      const completed = faker.datatype.boolean();
      const userId = faker.helpers.arrayElement(users).id;
      const categoryId = faker.helpers.arrayElement(categories).id;
      const dueDate = faker.date.future();
      const priority = faker.datatype.number({ min: 1, max: 3 });

      const task = await pool.query(
        `INSERT INTO tasks (title, description, completed, user_id, category_id, due_date, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [title, description, completed, userId, categoryId, dueDate, priority]
      );

      // Create Task Tags (randomly assign 1-3 tags to each task)
      const numTags = faker.datatype.number({ min: 1, max: 3 });
      for (let j = 0; j < numTags; j++) {
        const tag = faker.helpers.arrayElement(tags);
        await pool.query(
          'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)',
          [task.rows[0].id, tag.id]
        );
      }
    }

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

seedDatabase().then(() => {
  // Close the pool only after the seeding is complete
  setTimeout(() => {
    pool.end();
  }, 1000);
});
