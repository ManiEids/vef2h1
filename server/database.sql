-- Set schema
SET search_path TO h1todo, public;

-- Drop existing tables to start fresh (in reverse dependency order)
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS task_categories CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table - create first as it's referenced by tasks
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories table - create before tasks that reference it
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tags table - create before task_tags that references it
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table - depends on users and categories
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    priority INTEGER DEFAULT 3, -- 1 High, 2 Medium, 3 Low
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Task Categories (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS task_categories (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, category_id)
);

-- Task Tags (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);
CREATE INDEX idx_task_categories_task_id ON task_categories(task_id);
CREATE INDEX idx_task_categories_category_id ON task_categories(category_id);
CREATE INDEX idx_uploads_task_id ON uploads(task_id);

-- Create initial admin user (password: adminpassword)
-- Password hash will be replaced by your seed.js script
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2b$10$SAMPLE_HASH_TO_BE_REPLACED', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Add some basic categories
INSERT INTO categories (name, description)
VALUES 
  ('Work', 'Work-related tasks'),
  ('Personal', 'Personal tasks'),
  ('Study', 'Educational tasks'),
  ('Health', 'Health-related tasks'),
  ('Home', 'House chores and maintenance')
ON CONFLICT (name) DO NOTHING;

-- Add some basic tags
INSERT INTO tags (name)
VALUES 
  ('Urgent'),
  ('Important'),
  ('Low Priority'),
  ('Meeting'),
  ('Deadline')
ON CONFLICT (name) DO NOTHING;

-- Insert some sample tasks
-- Removed "ON CONFLICT (title) DO NOTHING" because "title" is not unique
INSERT INTO tasks (title, description, user_id)
VALUES
  ('Learn JavaScript', 'Study JavaScript fundamentals', 1),
  ('Build a Todo App', 'Create a basic todo application', 1),
  ('Deploy to Render', 'Deploy the todo application to Render', 1);
