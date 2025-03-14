// Main app file - handles UI interaction and rendering
// DOM Elements
const elements = {
    tasksList: document.getElementById('tasks-list'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    emptyState: document.getElementById('empty-state'),
    retryButton: document.getElementById('retry-button'),
    addTaskButton: document.getElementById('task-form'),
    title: document.getElementById('title'),
    description: document.getElementById('description'),
    sortSelect: document.getElementById('sort-select'),
    categoriesList: document.getElementById('categories-list'),
    tagsList: document.getElementById('tags-list'),
    allCount: document.getElementById('all-count'),
    completedCount: document.getElementById('completed-count'),
    loginForm: document.getElementById('login-form'),
    userInfo: document.getElementById('userInfo'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    loginButton: document.getElementById('login-button'),
    logoutButton: document.getElementById('logout-button'),
    taskDescription: document.getElementById('taskDescription'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    taskContainer: document.getElementById('taskContainer'),
    userCount: document.getElementById('user-count'),
    taskCount: document.getElementById('task-count')
};

const API_URL = 'https://vef2hop1manisolo.onrender.com';
let token = localStorage.getItem('token');
let currentFilter = 'all';
// Check authentication status
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

// Handle login
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
// Handle logout
function handleLogout() {
    token = null;
    localStorage.removeItem('token');
    checkAuthStatus();
    loadTasks();
}
// Handle task creation
async function handleCreateTask(event) {
    event.preventDefault();

    const title = elements.title.value;
    const description = elements.description.value;

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

        if (response.ok) {
            const data = await response.json();
            elements.title.value = '';
            elements.description.value = '';
            loadTasks();
        } else {
            const data = await response.json();
            alert(`Villa: ${data.error || 'Óþekkt villa'}`);
        }
    } catch (error) {
        console.error('Villa við að búa til verkefni:', error);
        alert('Villa kom upp við að búa til verkefni');
    }
}

// Sækja verkefni frá vefþjónustu
async function loadTasks() {
    elements.loadingState.classList.remove('hidden');
    elements.tasksList.innerHTML = '';
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    try {
        const response = await fetch(`${API_URL}/tasks`);
        const data = await response.json();
        elements.loadingState.classList.add('hidden');
        if (data.tasks && data.tasks.length > 0) {
            renderTasks(data.tasks);
        } else {
            elements.emptyState.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Villa við að sækja verkefni:', error);
        elements.loadingState.classList.add('hidden');
        elements.errorState.classList.remove('hidden');
    }
}

// Render tasks
function renderTasks(tasks) {
    elements.tasksList.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = `${task.title} - completed: ${task.completed ? 'Yes' : 'No'}`;
        elements.tasksList.appendChild(li);
    });
}

async function getDatabaseInfo() {
    try {
        const usersResponse = await fetch(`${API_URL}/auth/users`);
        const usersData = await usersResponse.json();
        elements.userCount.textContent = usersData.count;

        const tasksResponse = await fetch(`${API_URL}/tasks`);
        const tasksData = await tasksResponse.json();
        elements.taskCount.textContent = tasksData.tasks.length;
    } catch (error) {
        console.error('Error fetching database info:', error);
        elements.userCount.textContent = 'Error';
        elements.taskCount.textContent = 'Error';
    }
}

// Set up event listeners
function setupEventListeners() {
    elements.loginButton.addEventListener('click', handleLogin);
    elements.logoutButton.addEventListener('click', handleLogout);
    elements.taskForm.addEventListener('submit', handleCreateTask);
    elements.retryButton.addEventListener('click', loadTasks);
}

// Initialize the app
function initApp() {
    API_URL = window.location.hostname === 'http://localhost:3000' ? 'http://localhost:3000' : 'https://vef2hop1manisolo.onrender.com';
    checkAuthStatus();
    setupEventListeners();
    loadTasks();
    getDatabaseInfo();
}

// Run the app when the page is ready
document.addEventListener('DOMContentLoaded', initApp);