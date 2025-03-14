import request from 'supertest';
import { app } from './index.js'; // Assuming your main app file is index.js
import { pool } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Task API Endpoints', () => {
  let adminToken;
  let taskId;

  beforeAll(async () => {
    // Create an admin user for testing
    const password = 'adminpassword';
    const passwordHash = await bcrypt.hash(password, 10);
    const adminUser = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
      ['testadmin', passwordHash, 'admin']
    );

    // Generate a JWT token for the admin user
    adminToken = jwt.sign(
      { userId: adminUser.rows[0].id, role: adminUser.rows[0].role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
  });

  it('should create a new task (POST /tasks) - requires authentication', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Task',
        description: 'Test Description',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    taskId = res.body.id; // Store the task ID for later tests
  });

  it('should get all tasks (GET /tasks)', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a specific task by ID (GET /tasks/:id)', async () => {
    const res = await request(app).get(`/tasks/${taskId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', taskId);
  });

  it('should update a task (PUT /tasks/:id) - requires admin role', async () => {
    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        completed: true,
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('completed', true);
  });

  afterAll(async () => {
    // Clean up the test data
    await pool.query('DELETE FROM tasks WHERE title = $1', ['Test Task']);
    await pool.query('DELETE FROM users WHERE username = $1', ['testadmin']);
  });
});
