/* ============================================================
   script.js  —  Todo List Logic
   Sections:
     1. State — the tasks array and active filter
     2. Persistence — read/write localStorage
     3. addTask()   — create a new task
     4. toggleTask()— mark a task complete / incomplete
     5. deleteTask()— remove a task
     6. editTask()  — rename a task
     7. setFilter() — switch the active filter button
     8. clearCompleted() — remove all done tasks
     9. getFiltered()    — return tasks matching the active filter
    10. renderTasks()    — draw the task list + update stats
    11. Helper functions — formatDate, isOverdue, escapeHtml
    12. Initialisation  — run on page load
   ============================================================ */


/* ============================================================
   1. STATE
   ============================================================ */

// 'tasks' holds all task objects.
// Each task looks like:
// {
//   id: 1718000000000,       (timestamp used as unique id)
//   text: "Buy groceries",
//   priority: "high",        ("high" | "medium" | "low")
//   dueDate: "2025-07-01",   (ISO date string, or "")
//   completed: false,
//   createdAt: "2025-06-25T..."
// }
let tasks = [];

// Which filter is currently active: "all" | "active" | "completed" | "high"
let currentFilter = 'all';


/* ============================================================
   2. PERSISTENCE — localStorage helpers
   ============================================================ */

// Load tasks saved in the browser's localStorage
function loadTasks() {
  const saved = localStorage.getItem('todo_tasks');
  tasks = saved ? JSON.parse(saved) : [];
}

// Save the current tasks array to localStorage
function saveTasks() {
  localStorage.setItem('todo_tasks', JSON.stringify(tasks));
}


/* ============================================================
   3. addTask() — read the form and create a new task
   ============================================================ */
function addTask() {
  const input       = document.getElementById('taskInput');
  const priorityEl  = document.getElementById('prioritySelect');
  const dueDateEl   = document.getElementById('dueDateInput');

  const text = input.value.trim();

  // Highlight the input red if empty
  if (!text) {
    input.focus();
    input.style.borderColor = '#f87171';
    setTimeout(() => (input.style.borderColor = ''), 800);
    return;
  }

  // Build the new task object
  const newTask = {
    id:        Date.now(),          // unique numeric id
    text:      text,
    priority:  priorityEl.value,
    dueDate:   dueDateEl.value,     // "" if not set
    completed: false,
    createdAt: new Date().toISOString()
  };

  // Add to the beginning of the list (newest first)
  tasks.unshift(newTask);

  // Persist + refresh the UI
  saveTasks();
  renderTasks();

  // Clear inputs for the next entry
  input.value      = '';
  dueDateEl.value  = '';
  input.focus();
}


/* ============================================================
   4. toggleTask() — flip a task between done and not done
   ============================================================ */
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}


/* ============================================================
   5. deleteTask() — permanently remove one task
   ============================================================ */
function deleteTask(id) {
  // Keep all tasks EXCEPT the one with the matching id
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}


/* ============================================================
   6. editTask() — let the user rename a task via a prompt
   ============================================================ */
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const newText = prompt('Edit task:', task.text);

  // Only update if the user confirmed and didn't leave it blank
  if (newText !== null && newText.trim()) {
    task.text = newText.trim();
    saveTasks();
    renderTasks();
  }
}


/* ============================================================
   7. setFilter() — switch which filter button is active
   ============================================================ */
function setFilter(filterName, clickedButton) {
  currentFilter = filterName;

  // Remove "active" from all filter buttons, then add it to the clicked one
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  clickedButton.classList.add('active');

  renderTasks();
}


/* ============================================================
   8. clearCompleted() — remove every task that is marked done
   ============================================================ */
function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
}


/* ============================================================
   9. getFiltered() — return the subset matching currentFilter
   ============================================================ */
function getFiltered() {
  switch (currentFilter) {
    case 'active':    return tasks.filter(t => !t.completed);
    case 'completed': return tasks.filter(t => t.completed);
    case 'high':      return tasks.filter(t => t.priority === 'high');
    default:          return tasks;   // "all"
  }
}


/* ============================================================
   10. renderTasks() — main render function
       Updates stats, progress bar, and the task list HTML
   ============================================================ */
function renderTasks() {
  const listEl   = document.getElementById('taskList');
  const filtered = getFiltered();

  // --- Update stats ---
  const total  = tasks.length;
  const done   = tasks.filter(t => t.completed).length;
  const active = total - done;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('statTotal').textContent  = total;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statDone').textContent   = done;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressBar').style.width = pct + '%';

  // --- Show empty state if nothing to display ---
  if (filtered.length === 0) {
    const messages = {
      completed: "Nothing completed yet.",
      active:    "All done! Great work. 🎉",
      default:   "No tasks yet. Add one above!"
    };
    const msg = messages[currentFilter] || messages.default;

    listEl.innerHTML = `
      <div class="empty-state">
        <div class="emoji">✦</div>
        <p>${msg}</p>
      </div>`;
    return;
  }

  // --- Build HTML for each task ---
  listEl.innerHTML = filtered.map(task => buildTaskHTML(task)).join('');
}


/* ============================================================
   buildTaskHTML() — returns the HTML string for one task card
   ============================================================ */
function buildTaskHTML(task) {
  const overdueClass = (!task.completed && isOverdue(task.dueDate)) ? 'overdue' : '';

  // Due date label (only shown if a date was set)
  const dueDateLabel = task.dueDate
    ? `<span class="due-date ${overdueClass}">
         📅 ${formatDate(task.dueDate)}${overdueClass ? ' · Overdue' : ''}
       </span>`
    : '';

  return `
    <div class="task-item ${task.completed ? 'completed' : ''}" data-priority="${task.priority}">

      <!-- Checkbox -->
      <div class="task-checkbox ${task.completed ? 'checked' : ''}"
           onclick="toggleTask(${task.id})">
      </div>

      <!-- Text + meta info -->
      <div class="task-body">
        <div class="task-text">${escapeHtml(task.text)}</div>
        <div class="task-meta">
          <span class="priority-badge ${task.priority}">${task.priority}</span>
          ${dueDateLabel}
        </div>
      </div>

      <!-- Edit / Delete buttons (visible on hover via CSS) -->
      <div class="task-actions">
        <button class="icon-btn"     title="Edit"   onclick="editTask(${task.id})">✎</button>
        <button class="icon-btn del" title="Delete" onclick="deleteTask(${task.id})">✕</button>
      </div>

    </div>`;
}


/* ============================================================
   11. HELPER FUNCTIONS
   ============================================================ */

// Format "2025-07-01" → "Jul 1, 2025"
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Append time to avoid timezone shifting the date
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Return true if the due date is before today (and not empty)
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return due < today;
}

// Prevent XSS by converting HTML special characters in user input
function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}


/* ============================================================
   12. INITIALISATION — runs when the page first loads
   ============================================================ */

// Press Enter to add a task (same as clicking the Add button)
document.getElementById('taskInput').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    addTask();
  }
});

// Load saved tasks, then draw the initial list
loadTasks();
renderTasks();


/* ============================================================
   13. PRODUCTIVITY TOOLS (Stopwatch & Timer)
   ============================================================ */

// --- Stopwatch State ---
let swInterval = null;
let swElapsedMs = 0;
let swIsRunning = false;
let swLastTime = 0;

// --- Timer State ---
let tmInterval = null;
let tmRemainingMs = 0;
let tmIsRunning = false;
let tmLastTime = 0;

// --- Formatting Helper ---
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${h}:${m}:${s}`;
  }
  return `${m}:${s}`;
}

function formatStopwatch(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  const cs = String(centiseconds).padStart(2, '0');

  if (hours > 0) {
    return `${h}:${m}:${s}`;
  }
  return `${m}:${s}.${cs}`;
}

// --- Stopwatch Logic ---
function updateStopwatchDisplay() {
  document.getElementById('stopwatchDisplay').textContent = formatStopwatch(swElapsedMs);
}

function toggleStopwatch() {
  const btn = document.getElementById('swStartBtn');
  if (swIsRunning) {
    // Pause
    clearInterval(swInterval);
    swIsRunning = false;
    btn.textContent = 'Start';
    btn.classList.remove('danger');
  } else {
    // Start
    swLastTime = Date.now();
    swInterval = setInterval(() => {
      const now = Date.now();
      swElapsedMs += (now - swLastTime);
      swLastTime = now;
      updateStopwatchDisplay();
    }, 10);
    swIsRunning = true;
    btn.textContent = 'Pause';
    btn.classList.add('danger');
  }
}

function resetStopwatch() {
  clearInterval(swInterval);
  swIsRunning = false;
  swElapsedMs = 0;
  updateStopwatchDisplay();
  const btn = document.getElementById('swStartBtn');
  btn.textContent = 'Start';
  btn.classList.remove('danger');
}

// --- Timer Logic ---
function updateTimerDisplay() {
  document.getElementById('timerDisplay').textContent = formatTime(tmRemainingMs);
}

function toggleTimer() {
  const btn = document.getElementById('tmStartBtn');
  const inputWrap = document.getElementById('timerInputWrap');
  const display = document.getElementById('timerDisplay');
  const minInput = document.getElementById('timerMinInput');

  if (tmIsRunning) {
    // Pause
    clearInterval(tmInterval);
    tmIsRunning = false;
    btn.textContent = 'Resume';
    btn.classList.remove('danger');
  } else {
    // Start
    if (tmRemainingMs === 0) {
      // Initialize from input
      let mins = parseInt(minInput.value, 10);
      if (isNaN(mins) || mins <= 0) mins = 25; // Default 25 min
      tmRemainingMs = mins * 60 * 1000;
    }

    inputWrap.style.display = 'none';
    display.style.display = 'block';
    updateTimerDisplay();

    tmLastTime = Date.now();
    tmInterval = setInterval(() => {
      const now = Date.now();
      tmRemainingMs -= (now - tmLastTime);
      tmLastTime = now;

      if (tmRemainingMs <= 0) {
        // Timer finished
        clearInterval(tmInterval);
        tmRemainingMs = 0;
        tmIsRunning = false;
        updateTimerDisplay();
        btn.textContent = 'Start';
        btn.classList.remove('danger');
        
        // Simple visual alert or sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
        
        // Slight delay for alert so UI updates first
        setTimeout(() => {
            alert('Timer finished!');
            resetTimer();
        }, 50);
        return;
      }
      updateTimerDisplay();
    }, 100);

    tmIsRunning = true;
    btn.textContent = 'Pause';
    btn.classList.add('danger');
  }
}

function resetTimer() {
  clearInterval(tmInterval);
  tmIsRunning = false;
  tmRemainingMs = 0;
  
  document.getElementById('timerInputWrap').style.display = 'flex';
  document.getElementById('timerDisplay').style.display = 'none';
  
  const btn = document.getElementById('tmStartBtn');
  btn.textContent = 'Start';
  btn.classList.remove('danger');
}

// --- Pomodoro State ---
let pmInterval = null;
let pmRemainingMs = 25 * 60 * 1000;
let pmIsRunning = false;
let pmLastTime = 0;
let pmCurrentMode = 'work'; // 'work' or 'break'

// --- Pomodoro Logic ---
function updatePomodoroDisplay() {
  document.getElementById('pomodoroDisplay').textContent = formatTime(pmRemainingMs);
}

function setPomodoroMode(mode) {
  if (pmIsRunning) return; // Don't allow changing mode while running
  pmCurrentMode = mode;
  
  // Update active button styling
  const btns = document.querySelectorAll('.pm-mode-btn');
  btns.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // Set initial time based on mode
  if (mode === 'work') {
    pmRemainingMs = 25 * 60 * 1000;
  } else if (mode === 'break') {
    pmRemainingMs = 5 * 60 * 1000;
  }
  updatePomodoroDisplay();
}

function togglePomodoro() {
  const btn = document.getElementById('pmStartBtn');

  if (pmIsRunning) {
    // Pause
    clearInterval(pmInterval);
    pmIsRunning = false;
    btn.textContent = 'Resume';
    btn.classList.remove('danger');
  } else {
    // Start
    pmLastTime = Date.now();
    pmInterval = setInterval(() => {
      const now = Date.now();
      pmRemainingMs -= (now - pmLastTime);
      pmLastTime = now;

      if (pmRemainingMs <= 0) {
        // Pomodoro finished
        clearInterval(pmInterval);
        pmRemainingMs = 0;
        pmIsRunning = false;
        updatePomodoroDisplay();
        btn.textContent = 'Start';
        btn.classList.remove('danger');
        
        // Play sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
        
        setTimeout(() => {
            alert(pmCurrentMode === 'work' ? 'Work session complete! Take a break.' : 'Break is over! Time to focus.');
            // Auto reset to default time for current mode
            setPomodoroMode(pmCurrentMode);
        }, 50);
        return;
      }
      updatePomodoroDisplay();
    }, 100);

    pmIsRunning = true;
    btn.textContent = 'Pause';
    btn.classList.add('danger');
  }
}

function resetPomodoro() {
  clearInterval(pmInterval);
  pmIsRunning = false;
  
  // Reset time based on current mode
  if (pmCurrentMode === 'work') {
    pmRemainingMs = 25 * 60 * 1000;
  } else if (pmCurrentMode === 'break') {
    pmRemainingMs = 5 * 60 * 1000;
  }
  
  updatePomodoroDisplay();
  
  const btn = document.getElementById('pmStartBtn');
  btn.textContent = 'Start';
  btn.classList.remove('danger');
}

// Initialize displays
updateStopwatchDisplay();
updatePomodoroDisplay();
