// Fronta kóði fyrir verkefnalista - Client side code

// API slóð - vafri tengist þessu URL
const API_URL = 'https://vef2hop1manisolo.onrender.com';

// Token til að geyma milli HTTP beiðna
let token = null;

// Innskráninga fall - fyrir notendatengingu
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // Senda innskráningarbeiðni á bakenda
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

// Sækja öll verkefni - þarf ekki að vera innskráður
async function getTasks() {
  const res = await fetch(`${API_URL}/tasks`);
  const data = await res.json();
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  
  // Birta verkefni í lista
  if (data.tasks && Array.isArray(data.tasks)) {
    data.tasks.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = `${t.title} - completed: ${t.completed ? 'Yes' : 'No'}`;
      list.appendChild(li);
    });
  } else if (Array.isArray(data)) {
    // Eldra format
    data.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = `${t.title} - completed: ${t.completed ? 'Yes' : 'No'}`;
      list.appendChild(li);
    });
  }
}

// Búa til nýtt verkefni - þarf að vera innskráður
async function createTask() {
  if (!token) {
    alert('Login first');
    return;
  }
  
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  
  // Senda beiðni á bakenda
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

// Uppsetning við DOMContentLoadedsername');
document.addEventListener('DOMContentLoaded', function() {
  // Sjálfgefið
  const usernameField = document.getElementById('username');
  const passwordField = document.getElementById('password');
  
  if (usernameField && passwordField) {
    usernameField.value = 'admin';
    passwordField.value = 'admin';
  }
});
