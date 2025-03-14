// Stillingar
let API_URL = '';
let token = localStorage.getItem('token');
let currentFilter = 'all';

// DOM hlutir
const elements = {
  loginForm: document.getElementById('login-form'),
  userInfo: document.getElementById('user-info'),
  currentUser: document.getElementById('current-user'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  loginButton: document.getElementById('login-button'),
  logoutButton: document.getElementById('logout-button'),
  taskForm: document.getElementById('task-form'),
  taskTitle: document.getElementById('task-title'),
  taskDescription: document.getElementById('task-description'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  loading: document.getElementById('loading'),
  taskContainer: document.getElementById('task-container')
};

// Athuga hvort notandi sé innskráður við upphaf
function checkAuthStatus() {
  if (token) {
    elements.loginForm.classList.add('hidden');
    elements.userInfo.classList.remove('hidden');
    elements.currentUser.textContent = 'Innskráð(ur)';
  } else {
    elements.loginForm.classList.remove('hidden');
    elements.userInfo.classList.add('hidden');
  }
}

// Innskráning notanda
async function handleLogin() {
  const username = elements.username.value;
  const password = elements.password.value;

  if (!username || !password) {
    alert('Vinsamlegast fylltu út notandanafn og lykilorð');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.token) {
      token = data.token;
      localStorage.setItem('token', token);
      checkAuthStatus();
      loadTasks();
    } else {
      alert('Innskráning mistókst');
    }
  } catch (error) {
    console.error('Villa við innskráningu:', error);
    alert('Villa kom upp við innskráningu');
  }
}

// Útskráning notanda
function handleLogout() {
  token = null;
  localStorage.removeItem('token');
  checkAuthStatus();
  loadTasks();
}

// Búa til nýtt verkefni
async function handleCreateTask(event) {
  event.preventDefault();

  const title = elements.taskTitle.value;
  const description = elements.taskDescription.value;

  if (!title) {
    alert('Verkefni verður að hafa titil');
    return;
  }

  if (!token) {
    alert('Þú þarft að vera innskráð(ur) til að búa til verkefni');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description })
    });

    const data = await response.json();

    if (response.ok) {
      elements.taskTitle.value = '';
      elements.taskDescription.value = '';
      loadTasks();
    } else {
      alert(`Villa: ${data.error || 'Óþekkt villa'}`);
    }
  } catch (error) {
    console.error('Villa við að búa til verkefni:', error);
    alert('Villa kom upp við að búa til verkefni');
  }
}

// Sækja verkefni frá vefþjónustu
async function loadTasks() {
  elements.loading.classList.remove('hidden');
  elements.taskContainer.innerHTML = '';

  try {
    const response = await fetch(`${API_URL}/tasks`);
    let data = await response.json();
    
    elements.loading.classList.add('hidden');

    // Athuga hvort svörunin sé fylki eða object með tasks eigenleika
    const tasks = Array.isArray(data) ? data : data.tasks || [];

    if (tasks.length === 0) {
      elements.taskContainer.innerHTML = '<div class="empty-state">Engin verkefni til að sýna</div>';
      return;
    }

    // Sía verkefni eftir stöðu
    const filteredTasks = currentFilter === 'completed' 
      ? tasks.filter(task => task.completed)
      : tasks.filter(task => !task.completed);

    if (filteredTasks.length === 0) {
      elements.taskContainer.innerHTML = `<div class="empty-state">
        Engin ${currentFilter === 'completed' ? 'kláruð' : 'óklárað'} verkefni</div>`;
      return;
    }

    // Birta verkefni
    filteredTasks.forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
      taskElement.dataset.id = task.id;

      taskElement.innerHTML = `
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="complete-button" ${task.completed ? 'disabled' : ''}>
            ${task.completed ? 'Lokið' : 'Klára'}
          </button>
        </div>
      `;

      elements.taskContainer.appendChild(taskElement);

      // Tengja atburð við "Klára" hnapp
      const completeButton = taskElement.querySelector('.complete-button');
      if (!task.completed) {
        completeButton.addEventListener('click', () => completeTask(task.id));
      }
    });
  } catch (error) {
    console.error('Villa við að sækja verkefni:', error);
    elements.loading.classList.add('hidden');
    elements.taskContainer.innerHTML = '<div class="error-state">Villa kom upp við að sækja verkefni</div>';
  }
}

// Merkja verkefni sem klárað
async function completeTask(taskId) {
  if (!token) {
    alert('Þú þarft að vera innskráð(ur) til að uppfæra verkefni');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ completed: true })
    });

    if (response.ok) {
      loadTasks();
    } else {
      const data = await response.json();
      alert(`Villa: ${data.error || 'Óþekkt villa'}`);
    }
  } catch (error) {
    console.error('Villa við að uppfæra verkefni:', error);
    alert('Villa kom upp við að uppfæra verkefni');
  }
}

// Meðhöndla þegar síun er breytt
function handleFilterChange(event) {
  const filterButton = event.target;
  if (!filterButton.classList.contains('filter-btn')) return;

  elements.filterButtons.forEach(btn => btn.classList.remove('active'));
  filterButton.classList.add('active');

  currentFilter = filterButton.dataset.filter;
  loadTasks();
}

// Uppsetning atburðahlustara
function setupEventListeners() {
  elements.loginButton.addEventListener('click', handleLogin);
  elements.logoutButton.addEventListener('click', handleLogout);
  elements.taskForm.addEventListener('submit', handleCreateTask);
  
  document.querySelector('.filter-options').addEventListener('click', handleFilterChange);
}

// Frumstilla forrit
function initApp() {
  // Setja API URL - í þróunarumhverfi notum við grunn URL, á Render notum við bara relative slóð
  API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
  
  checkAuthStatus();
  setupEventListeners();
  loadTasks();
}

// Keyra forritið þegar síðan er tilbúin
document.addEventListener('DOMContentLoaded', initApp);
