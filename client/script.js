// For local development testing:
const API_URL = 'http://localhost:3000';

// For production, change to your deployed backend URL:
// const API_URL = 'https://your-backend-name.onrender.com';

let token = null;

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    alert('Logged in!');
    getTasks();
  } else {
    alert('Login failed');
  }
}

async function getTasks() {
  const res = await fetch(`${API_URL}/tasks`);
  const data = await res.json();
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  
  if (data.tasks && Array.isArray(data.tasks)) {
    data.tasks.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = `${t.title} - completed: ${t.completed ? 'Yes' : 'No'}`;
      list.appendChild(li);
    });
  } else if (Array.isArray(data)) {
    data.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = `${t.title} - completed: ${t.completed ? 'Yes' : 'No'}`;
      list.appendChild(li);
    });
  }
}

async function createTask() {
  if (!token) {
    alert('Login first');
    return;
  }
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description }),
  });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
  } else {
    alert('Task created!');
    getTasks();
  }
}

// Remove or comment out the uploadFile function since we're skipping that for now
