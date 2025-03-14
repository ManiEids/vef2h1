// Main app 
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
    dbLastChecked: document.getElementById('db-last-checked'),
    dueDate: document.getElementById('due-date'),
    priority: document.getElementById('priority'),
    categorySelect: document.getElementById('category-select'),
    tagSelect: document.getElementById('tag-select'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    prevPageBtn: document.getElementById('prev-page'),
    nextPageBtn: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    taskImage: document.getElementById('task-image')
  };

  // nota let
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
  let categories = [];
  let tags = [];
  let currentCategoryFilter = null;
  let currentTagFilter = null;
  let searchTerm = '';
  let currentSortMethod = 'newest';
  let currentPage = 1;
  let pageSize = 10;
  let totalPages = 1;
  
  // Checka status
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
  
      // Check if the response is ok before parsing JSON
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Innskráning mistókst');
      }
  
      const data = await response.json();
      if (data.token) {
        token = data.token;
        localStorage.setItem('token', token);
        checkAuthStatus();
        loadTasks(); // Reload tasks after login
        alert('Innskráning tókst!');
        
        // Get user info if possible
        try {
          const userResponse = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            elements.currentUser.textContent = `Innskráður sem: ${userData.username}`;
          }
        } catch (userError) {
          console.error('Error fetching user data:', userError);
          elements.currentUser.textContent = 'Innskráður';
        }
      } else {
        throw new Error('Enginn token í svari');
      }
    } catch (error) {
      console.error('Villa við innskráningu:', error);
      alert(error.message || 'Villa kom upp við innskráningu');
    }
  }
  
  // Handle logout
  function handleLogout() {
    token = null;
    localStorage.removeItem('token');
    checkAuthStatus();
    loadTasks();
  }
  
  // Enhanced task creation with file upload
  async function handleCreateTask(event) {
    event.preventDefault();
    
    const title = elements.title.value;
    const description = elements.description.value;
    const dueDate = elements.dueDate ? elements.dueDate.value : null;
    const priority = elements.priority ? parseInt(elements.priority.value) : 2;
    const categoryId = elements.categorySelect && elements.categorySelect.value ? 
                     parseInt(elements.categorySelect.value) : null;
    
    if (!title) {
      alert('Verkefni verður að hafa titil');
      return;
    }
  
    if (!token) {
      alert('Þú þarft að vera innskráð(ur) til að búa til verkefni');
      return;
    }
    
    // Get selected tags
    const selectedTags = [];
    if (elements.tagSelect) {
      Array.from(elements.tagSelect.selectedOptions).forEach(option => {
        selectedTags.push(parseInt(option.value));
      });
    }
    
    // Create task data
    const taskData = {
      title,
      description,
      priority,
      tags: selectedTags
    };
    
    if (dueDate) {
      taskData.due_date = dueDate;
    }
    
    if (categoryId) {
      taskData.category_id = categoryId;
    }
    
    try {
      // Step 1: Create the task
      const taskResponse = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });
      
      if (!taskResponse.ok) {
        const errorData = await taskResponse.json();
        throw new Error(errorData.error || 'Failed to create task');
      }
      
      const taskResult = await taskResponse.json();
      const taskId = taskResult.id;
      
      // Step 2: Upload image if provided
      if (elements.taskImage && elements.taskImage.files.length > 0) {
        const formData = new FormData();
        formData.append('image', elements.taskImage.files[0]);
        formData.append('taskId', taskId);
        
        const uploadResponse = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          console.error('Image upload failed but task was created');
        }
      }
      
      // Clear form
      elements.title.value = '';
      elements.description.value = '';
      if (elements.dueDate) elements.dueDate.value = '';
      if (elements.priority) elements.priority.value = '2';
      if (elements.categorySelect) elements.categorySelect.value = '';
      if (elements.tagSelect) {
        Array.from(elements.tagSelect.options).forEach(option => {
          option.selected = false;
        });
      }
      if (elements.taskImage) elements.taskImage.value = '';
      
      // Reload tasks
      loadTasks();
      alert('Verkefni búið til!');
    } catch (error) {
      console.error('Error creating task:', error);
      alert(error.message || 'Villa kom upp við að búa til verkefni');
    }
  }
  
  // Fetch tasks with pagination and filters
  async function loadTasks() {
    elements.loadingState.classList.remove('hidden');
    elements.tasksList.innerHTML = '';
    elements.emptyState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    
    let url = `${API_URL}/tasks?page=${currentPage}&limit=${pageSize}`;
    
    if (currentFilter === 'completed') {
      url += '&completed=true';
    }
    
    if (currentCategoryFilter) {
      url += `&category=${currentCategoryFilter}`;
    }
    
    if (currentTagFilter) {
      url += `&tag=${currentTagFilter}`;
    }
    
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }
    
    if (currentSortMethod) {
      url += `&sort=${currentSortMethod}`;
    }
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      elements.loadingState.classList.add('hidden');
      
      if (data.tasks && data.tasks.length > 0) {
        tasks = data.tasks;
        totalPages = data.pagination.totalPages;
        
        updatePagination(data.pagination.currentPage, data.pagination.totalPages);
        updateTaskCounts();
        renderTasks(tasks);
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
  
  // Enhanced render tasks
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
      
      let priorityClass = 'priority-medium';
      if (task.priority === 1) priorityClass = 'priority-high';
      if (task.priority === 3) priorityClass = 'priority-low';
      
      // Format due date if exists
      let dueDateText = '';
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        dueDateText = `Skiladagur: ${dueDate.toLocaleDateString('is-IS')}`;
      }
      
      // Create tag pills HTML - handle case where tags might not have color
      let tagPills = '';
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
          const tagColor = tag.color || '#6c757d'; // Default color if missing
          tagPills += `<span class="tag-pill" style="background-color: ${tagColor}">${tag.name}</span>`;
        });
      }
      
      // Create category pill HTML - handle case where category might not have color
      let categoryPill = '';
      if (task.category_name) {
        const categoryColor = task.category_color || '#6c757d'; // Default color if missing
        categoryPill = `<span class="category-pill" style="background-color: ${categoryColor}">${task.category_name}</span>`;
      }
      
      // Image preview if available - works with your uploads table
      let imageHtml = '';
      if (task.image_url) {
        imageHtml = `<div class="task-image"><img src="${task.image_url}" alt="Task attachment"></div>`;
      }
      
      li.innerHTML = `
        <div class="task-header">
          <div class="task-content">
            <div class="task-title">${task.title}</div>
            <div class="task-description">${task.description || ''}</div>
            ${imageHtml}
          </div>
          <div class="task-actions">
            <button class="toggle-btn" data-id="${task.id}">
              ${task.completed ? 'Afturkalla' : 'Klára'}
            </button>
            ${token ? `<button class="delete-btn" data-id="${task.id}">Eyða</button>` : ''}
          </div>
        </div>
        <div class="task-meta">
          ${categoryPill}
          ${tagPills}
          ${dueDateText ? `<span class="task-due-date">${dueDateText}</span>` : ''}
          <span class="task-priority">
            <span class="priority-indicator ${priorityClass}"></span>
            Forgangur: ${task.priority === 1 ? 'Hár' : task.priority === 2 ? 'Miðlungs' : 'Lágur'}
          </span>
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
  
  // Load categories and tags
  async function loadCategoriesAndTags() {
    try {
      // Load categories
      const categoriesResponse = await fetch(`${API_URL}/tasks/categories/all`);
      if (categoriesResponse.ok) {
        categories = await categoriesResponse.json();
        populateCategorySelect();
        renderCategoryFilters();
      }
      
      // Load tags
      const tagsResponse = await fetch(`${API_URL}/tasks/tags/all`);
      if (tagsResponse.ok) {
        tags = await tagsResponse.json();
        populateTagSelect();
        renderTagFilters();
      }
    } catch (error) {
      console.error('Error loading categories and tags:', error);
    }
  }
  
  // Populate category dropdown
  function populateCategorySelect() {
    if (!elements.categorySelect) return;
    
    elements.categorySelect.innerHTML = '<option value="">Veldu flokk</option>';
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      elements.categorySelect.appendChild(option);
    });
  }
  
  // Populate tag dropdown
  function populateTagSelect() {
    if (!elements.tagSelect) return;
    
    elements.tagSelect.innerHTML = '';
    
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.id;
      option.textContent = tag.name;
      elements.tagSelect.appendChild(option);
    });
  }
  
  // Render category filters
  function renderCategoryFilters() {
    if (!elements.categoriesList) return;
    
    elements.categoriesList.innerHTML = '<li class="category-item"><button class="category-filter-btn active">Allir</button></li>';
    
    categories.forEach(category => {
      const li = document.createElement('li');
      li.className = 'category-item';
      
      const button = document.createElement('button');
      button.className = 'category-filter-btn';
      button.textContent = category.name;
      if (category.color) {
        button.style.borderLeft = `4px solid ${category.color}`;
      }
      
      button.addEventListener('click', () => {
        document.querySelectorAll('.category-filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentCategoryFilter = category.id;
        currentPage = 1;
        applyFilters();
      });
      
      li.appendChild(button);
      elements.categoriesList.appendChild(li);
    });
    
    // Add event listener for "All" button
    const allCategoriesBtn = elements.categoriesList.querySelector('.category-filter-btn');
    allCategoriesBtn.addEventListener('click', () => {
      document.querySelectorAll('.category-filter-btn').forEach(btn => btn.classList.remove('active'));
      allCategoriesBtn.classList.add('active');
      
      currentCategoryFilter = null;
      currentPage = 1;
      applyFilters();
    });
  }
  
  // Render tag filters
  function renderTagFilters() {
    if (!elements.tagsList) return;
    
    elements.tagsList.innerHTML = '<li class="tag-item"><button class="tag-filter-btn active">Öll</button></li>';
    
    tags.forEach(tag => {
      const li = document.createElement('li');
      li.className = 'tag-item';
      
      const button = document.createElement('button');
      button.className = 'tag-filter-btn';
      button.textContent = tag.name;
      if (tag.color) {
        button.style.backgroundColor = tag.color;
        button.style.color = 'white';
      }
      
      button.addEventListener('click', () => {
        document.querySelectorAll('.tag-filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        currentTagFilter = tag.id;
        currentPage = 1;
        applyFilters();
      });
      
      li.appendChild(button);
      elements.tagsList.appendChild(li);
    });
    
    const allTagsBtn = elements.tagsList.querySelector('.tag-filter-btn');
    allTagsBtn.addEventListener('click', () => {
      document.querySelectorAll('.tag-filter-btn').forEach(btn => btn.classList.remove('active'));
      allTagsBtn.classList.add('active');
      
      currentTagFilter = null;
      currentPage = 1;
      applyFilters();
    });
  }
  
  
  function updatePagination(currentPage, totalPages) {
    elements.pageInfo.textContent = `Síða ${currentPage} af ${totalPages}`;
    
    elements.prevPageBtn.disabled = currentPage <= 1;
    elements.nextPageBtn.disabled = currentPage >= totalPages;
  }
  
  
  function setupSearch() {
    if (!elements.searchInput) return;
    
    elements.searchInput.addEventListener('input', debounce(() => {
      searchTerm = elements.searchInput.value.trim().toLowerCase();
      currentPage = 1; // resetta fyrstu síðu
      loadTasks();
    }, 500)); // 500ms ef mörg request
  }
  
  // sorting
  function setupSorting() {
    if (!elements.sortSelect) return;
    
    elements.sortSelect.addEventListener('change', () => {
      currentSortMethod = elements.sortSelect.value;
      loadTasks();
    });
  }
  
  // skella í pagination
  function setupPagination() {
    if (elements.prevPageBtn) {
      elements.prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadTasks();
        }
      });
    }
    
    if (elements.nextPageBtn) {
      elements.nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadTasks();
        }
      });
    }
  }
  
  // setja debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // event listenar
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
    
    // takkar
    elements.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => filterTasks(btn.getAttribute('data-filter')));
    });
  }
  
  // Initialize 
  function initApp() {
    checkAuthStatus();
    
    // Default login 
    if (elements.username && elements.password) {
      elements.username.value = 'admin';
      elements.password.value = 'admin';
    }
    
    setupEventListeners();
    loadCategoriesAndTags();
    setupSearch();
    setupSorting();
    setupPagination();
    loadTasks();
    checkDatabaseStatus();
    setInterval(checkDatabaseStatus, 30000);
  }
  
  // Run 
  initApp();
});


async function uploadTaskImage(taskId, fileInput) {
  if (!fileInput.files || fileInput.files.length === 0) {
    return null;
  }
  
  const formData = new FormData();
  formData.append('image', fileInput.files[0]);
  formData.append('taskId', taskId);
  
  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const result = await response.json();
    return result.fileUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}