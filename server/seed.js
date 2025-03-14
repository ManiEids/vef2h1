import { pool } from './db.js';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

async function seedDatabase() {
  try {
    // 1. Búa til admin notanda
    const password = 'adminpassword';
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      ['admin', passwordHash, 'admin']
    );

    console.log('Admin user created');

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    pool.end();
  }
}

// Keyra seeding og loka tengingu við gagnagrunn þegar það er klárað
seedDatabase();
