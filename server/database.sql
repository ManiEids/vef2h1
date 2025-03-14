-- Gagnagrunns skilgreiningar - Database schema fyrir todo appið

-- Búa til schema
CREATE SCHEMA IF NOT EXISTS h1todo;

-- Setja schema
SET search_path TO h1todo, public;

-- Fella töflur ef þær eru til (í öfugri röð miðað við tengingar)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS task_categories CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_history CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Notendatafla - búið til fyrst þar sem tasks vísar í hana
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flokkatafla - búið til áður en tasks sem vísa í hana
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6c757d',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tög tafla - búið til áður en task_tags sem vísa í hana
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6c757d',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verkefnatafla - háð notendum og flokkum
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 2, -- 1 High, 2 Medium, 3 Low
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Tags (many-to-many samband)
CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Verkefnasaga (til að fylgjast með breytingum)
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL, -- 'created', 'updated', 'completed', etc.
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Athugasemdatafla
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skrárviðhengi fyrir verkefni
CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_name VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes til að bæta query hraða
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

-- Upphaflegur admin notandi (lykilorð: admin)
INSERT INTO users (username, password_hash, role, email)
VALUES ('admin', '$2b$10$7TxahHgzQi2MvV5ktj5qkO7PQPkJImjcKuIci96bA2pZVC4CsvKju', 'admin', 'admin@example.com')
ON CONFLICT (username) DO NOTHING;

-- Nokkrir grunnflokkar
INSERT INTO categories (name, description, color)
VALUES 
  ('Vinna', 'Work-related tasks', '#0275d8'),
  ('Persónulegt', 'Personal tasks', '#5cb85c'),
  ('Nám', 'Educational tasks', '#f0ad4e'),
  ('Heilsa', 'Health-related tasks', '#d9534f'),
  ('Heimili', 'House chores and maintenance', '#6c757d')
ON CONFLICT (name) DO NOTHING;

-- Nokkur grunntög
INSERT INTO tags (name, color)
VALUES 
  ('Mikilvægt', '#dc3545'),
  ('Fundur', '#007bff'),
  ('Lágt forgangsstig', '#fd7e14'),
  ('Frestur', '#28a745'),
  ('Bíður', '#17a2b8')
ON CONFLICT (name) DO NOTHING;

-- Nokkur sýnishorn af verkefnum
INSERT INTO tasks (title, description, user_id)
VALUES
  ('Læra JavaScript', 'Study JavaScript fundamentals', 1),
  ('Byggja verkefni', 'Create a basic todo application', 1),
  ('Setja upp á Render', 'Deploy the todo application to Render', 1);
