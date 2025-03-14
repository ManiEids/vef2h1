let token = null;

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('http://localhost:3000/auth/login', {
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
  const res = await fetch('http://localhost:3000/tasks');
  const tasks = await res.json();
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.forEach((t) => {
    const li = document.createElement('li');
    li.textContent = `${t.title} - completed: ${t.completed}`;
    list.appendChild(li);
  });
}

async function createTask() {
  if (!token) {
    alert('Login first');
    return;
  }
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const res = await fetch('http://localhost:3000/tasks', {
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

async function uploadFile() {
  if (!token) {
    alert('Login first');
    return;
  }
  const fileInput = document.getElementById('fileInput');
  if (!fileInput.files.length) {
    alert('No file selected');
    return;
  }
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  const res = await fetch('http://localhost:3000/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
  } else {
    alert('File uploaded: ' + data.url);
  }
}
