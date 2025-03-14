// Main app file - handles UI interaction and rendering

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
  const elements = {
    tasksList: document.getElementById('tasks-list'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    emptyState: document.getElementById('empty-state'),
    retryButton: document.getElementById('retry-button'),
    taskForm: document.getElementById('task-form'),
    title: document.getElementById('title'),
    description: document.getElementById('description'),
    allCount: document.getElementById('all-count'),
    completedCount: document.getElementById('completed-count'),
    categoriesList: document.getElementById('categories-list'),
    tagsList: document.getElementById('tags-list'),
    loginForm: document.getElementById('login-form'),
    userInfo: document.getElementById('userInfo'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    loginButton: document.getElementById('login-button'),
    logoutButton: document.getElementById('logout-button'),
    currentUser: document.getElementById('currentUser'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    userCount: document.getElementById('user-count'),
    taskCount: document.getElementById('task-count'),
    dbConnectionStatus: document.getElementById('db-connection-status'),
    dbUserCount: document.getElementById('db-user-count'),
    dbTaskCount: document.getElementById('db-task-count'),
    dbLastChecked: document.getElementById('db-last-checked')
  };

  // Use let instead of const for API_URL since we're reassigning it
  let API_URL;
  
  if (window.location.hostname === 'localhost') {
    API_URL = 'http://localhost:3000';
  } else {
    API_URL = 'https://vef2hop1manisolo.onrender.com';
  }
  
  console.log('Using API URL:', API_URL);
  
  let token = localStorage.getItem('token');
  let currentFilter = 'all';
  let tasks = [];
  
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
        loadTasks(); // Reload tasks after login
        alert('Innskráning tókst!');
      } else {
        alert('Innskráning mistókst: ' + (data.error || 'Óþekkt villa'));
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
        // Clear form
        elements.title.value = '';
        elements.description.value = '';
        
        // Reload tasks to show the new one
        loadTasks();
        alert('Verkefni búið til!');
      } else {
        const errorData = await response.json();
        alert('Villa við að búa til verkefni: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Villa við að búa til verkefni:', error);
      alert('Villa kom upp við að búa til verkefni');
    }
  }
  
  // Fetch tasks from API
  async function loadTasks() {
    if (!elements.loadingState) {
      console.error("Loading state element not found");
      return;
    }
    
    elements.loadingState.classList.remove('hidden');
    elements.tasksList.innerHTML = '';
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    
    try {
      const response = await fetch(`${API_URL}/tasks`);
      const data = await response.json();
      
      elements.loadingState.classList.add('hidden');
      
      if (data.tasks && data.tasks.length > 0) {
        tasks = data.tasks;
        updateTaskCounts();
        filterTasks(currentFilter);
      } else {
        elements.emptyState.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Villa við að sækja verkefni:', error);
      elements.loadingState.classList.add('hidden');
      elements.errorState.classList.remove('hidden');
    }
  }
  
  // Update task counts
  function updateTaskCounts() {
    const completedTasks = tasks.filter(task => task.completed);
    elements.allCount.textContent = tasks.length;
    elements.completedCount.textContent = completedTasks.length;
    elements.taskCount.textContent = tasks.length;
  }
  
  // Filter tasks
  function filterTasks(filter) {
    currentFilter = filter;
    
    // Update active filter button
    elements.filterButtons.forEach(btn => {
      if (btn.getAttribute('data-filter') === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Filter tasks
    let filteredTasks = tasks;
    if (filter === 'completed') {
      filteredTasks = tasks.filter(task => task.completed);
    }
    
    renderTasks(filteredTasks);
  }
  
  // Render tasks
  function renderTasks(tasksToRender) {
    elements.tasksList.innerHTML = '';
    
    if (tasksToRender.length === 0) {
      elements.emptyState.classList.remove('hidden');
      return;
    }
    
    elements.emptyState.classList.add('hidden');
    
    tasksToRender.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      if (task.completed) {
        li.classList.add('completed');
      }
      
      li.innerHTML = `
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-description">${task.description || ''}</div>
        </div>
        <div class="task-actions">
          <button class="toggle-btn" data-id="${task.id}">
            ${task.completed ? 'Afturkalla' : 'Klára'}
          </button>
          ${token ? `<button class="delete-btn" data-id="${task.id}">Eyða</button>` : ''}
        </div>
      `;
      
      elements.tasksList.appendChild(li);
    });
    
    // Add event listeners for task action buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleTaskStatus(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTask(btn.getAttribute('data-id')));
    });
  }
  
  // Toggle task status
  async function toggleTaskStatus(id) {
    if (!token) {
      alert('Þú þarft að vera innskráð(ur) til að breyta verkefni');
      return;
    }
    
    const task = tasks.find(t => t.id === parseInt(id));
    if (!task) return;
    
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          completed: !task.completed
        })
      });
      
      if (response.ok) {
        loadTasks(); // Reload tasks to update UI
      } else {
        alert('Villa við að uppfæra verkefni');
      }
    } catch (error) {
      console.error('Villa við að uppfæra verkefni:', error);
      alert('Villa kom upp við að uppfæra verkefni');
    }
  }
  
  // Delete task
  async function deleteTask(id) {
    if (!token) {
      alert('Þú þarft að vera innskráð(ur) til að eyða verkefni');
      return;
    }
    
    if (!confirm('Ertu viss um að þú viljir eyða þessu verkefni?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        loadTasks(); // Reload tasks to update UI
      } else {
        alert('Villa við að eyða verkefni');
      }
    } catch (error) {
      console.error('Villa við að eyða verkefni:', error);
      alert('Villa kom upp við að eyða verkefni');
    }
  }
  
  // Check database connection status
  async function checkDatabaseStatus() {
    try {
      const response = await fetch(`${API_URL}/api/db-status`);
      
      if (!response.ok) {
        elements.dbConnectionStatus.textContent = 'Tenging mistókst';
        elements.dbConnectionStatus.className = 'disconnected';
        return;
      }
      
      const data = await response.json();
      console.log('Database status response:', data);
      
      // Update database status display
      if (data.connected) {
        elements.dbConnectionStatus.textContent = 'Tengt';
        elements.dbConnectionStatus.className = 'connected';
        elements.dbUserCount.textContent = data.stats.users || '0';
        elements.dbTaskCount.textContent = data.stats.tasks || '0';
        
        // Format date to Icelandic locale
        const timestamp = new Date(data.timestamp);
        elements.dbLastChecked.textContent = timestamp.toLocaleString('is-IS');
        
        // Also update the footer counters
        elements.userCount.textContent = data.stats.users || '0';
        elements.taskCount.textContent = data.stats.tasks || '0';
      } else {
        elements.dbConnectionStatus.textContent = 'Ekki tengt';
        elements.dbConnectionStatus.className = 'disconnected';
      }
    } catch (error) {
      console.error('Error checking database status:', error);
      elements.dbConnectionStatus.textContent = 'Villa við tengingu';
      elements.dbConnectionStatus.className = 'disconnected';
    }
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Attach event listeners only if elements exist
    if (elements.loginButton) {
      elements.loginButton.addEventListener('click', handleLogin);
    }
    
    if (elements.logoutButton) {
      elements.logoutButton.addEventListener('click', handleLogout);
    }
    
    if (elements.taskForm) {
      elements.taskForm.addEventListener('submit', handleCreateTask);
    }
    
    if (elements.retryButton) {
      elements.retryButton.addEventListener('click', loadTasks);
    }
    
    // Filter buttons
    elements.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => filterTasks(btn.getAttribute('data-filter')));
    });
  }
  
  // Initialize the app
  function initApp() {
    checkAuthStatus();
    setupEventListeners();
    loadTasks();
    
    // Check database status immediately
    checkDatabaseStatus();
    
    // Then check periodically
    setInterval(checkDatabaseStatus, 30000); // Check every 30 seconds
  }
  
  // Run the app
  initApp();
});