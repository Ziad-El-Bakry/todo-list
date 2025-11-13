document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const taskForm = document.getElementById('task-form');
    const taskTextInput = document.getElementById('task-text');
    const taskMinutesInput = document.getElementById('task-minutes');
    const taskList = document.getElementById('task-list');

    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editTaskId = document.getElementById('edit-task-id');
    const editTaskText = document.getElementById('edit-task-text');
    const editTaskMinutes = document.getElementById('edit-task-minutes');
    const editCancelBtn = document.getElementById('edit-cancel-btn');

    const notificationModal = document.getElementById('notification-modal');
    const notificationText = document.getElementById('notification-text');
    const notificationOkBtn = document.getElementById('notification-ok-btn');

    // --- App State ---
    let tasks = []; 
    let audioContext; 
    let currentFilter = 'all'; 

    // --- Functions ---

    function renderTasks() {
        taskList.innerHTML = '';

        const visibleTasks = tasks.filter(t => {
            if (currentFilter === 'active') return !t.completed;
            if (currentFilter === 'completed') return !!t.completed;
            return true;
        });

        if (visibleTasks.length === 0) {
            taskList.innerHTML = '<li class="text-center text-gray-500 italic p-4">No tasks yet. Add one above!</li>';
            updateCount();
            return;
        }

        visibleTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4';
            li.dataset.id = task.id;

            // Task Info Section
            const infoDiv = document.createElement('div');
            infoDiv.className = 'flex-grow';

            const label = document.createElement('label');
            label.className = 'flex items-center gap-3';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!task.completed;
            checkbox.className = 'h-5 w-5';
            checkbox.addEventListener('change', () => toggleComplete(task.id));

            const taskText = document.createElement('p');
            taskText.className = 'text-lg font-medium text-gray-900';
            if (task.completed) taskText.classList.add('completed');
            taskText.textContent = task.text;

            label.appendChild(checkbox);
            label.appendChild(taskText);
            infoDiv.appendChild(label);

            if (task.minutes) {
                const taskTime = document.createElement('p');
                taskTime.className = 'text-sm text-gray-600 timer-display';
                taskTime.textContent = `Time: ${formatTime(task.remainingSeconds)}`;
                infoDiv.appendChild(taskTime);
            }
            li.appendChild(infoDiv);

            // Buttons Section
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'flex-shrink-0 flex items-center gap-2';

            if (task.minutes) {
                const timerBtn = document.createElement('button');
                timerBtn.className = `timer-btn font-medium py-2 px-4 rounded-lg text-sm ${task.isRunning ? 'btn-danger' : 'btn-success'}`;
                timerBtn.textContent = task.isRunning ? 'Stop' : 'Start';
                timerBtn.addEventListener('click', () => handleTimerToggle(task.id));
                buttonsDiv.appendChild(timerBtn);
            }

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn btn-secondary font-medium py-2 px-4 rounded-lg text-sm';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => showEditModal(task.id));
            buttonsDiv.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn btn-danger font-medium py-2 px-4 rounded-lg text-sm';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => handleDeleteTask(task.id));
            buttonsDiv.appendChild(deleteBtn);

            if (task.completed) {
                const doneBadge = document.createElement('span');
                doneBadge.className = 'ml-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full';
                doneBadge.textContent = 'Done';
                buttonsDiv.appendChild(doneBadge);
            }

            li.appendChild(buttonsDiv);
            taskList.appendChild(li);
        });
    }

    function updateCount() {
        const countEl = document.getElementById('task-count');
        if (!countEl) return;
        countEl.textContent = tasks.length;
    }

    function toggleComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        saveTasksToStorage();
        renderTasks();
    }

    function formatTime(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function handleAddTask(event) {
        event.preventDefault();
        const text = taskTextInput.value.trim();
        const minutes = parseInt(taskMinutesInput.value, 10);

        if (!text) return;

        const newTask = {
            id: Date.now(),
            text: text,
            minutes: isNaN(minutes) ? null : minutes,
            remainingSeconds: isNaN(minutes) ? null : minutes * 60,
            timerId: null,
            endTime: null, // ★ NEW: To store when the timer finishes
            isRunning: false,
            completed: false
        };

        tasks.push(newTask);
        saveTasksToStorage();
        renderTasks();

        taskTextInput.value = '';
        taskMinutesInput.value = '';
    }

    function handleDeleteTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task && task.timerId) {
            clearInterval(task.timerId);
        }
        tasks = tasks.filter(task => task.id !== id);
        saveTasksToStorage();
        renderTasks();
    }

    function showEditModal(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        editTaskId.value = task.id;
        editTaskText.value = task.text;
        editTaskMinutes.value = task.minutes || '';
        
        editModal.classList.add('flex');
        editTaskText.focus();
    }

    function hideEditModal() {
        editModal.classList.remove('flex');
    }

    function handleSaveEdit(event) {
        event.preventDefault();
        const id = parseInt(editTaskId.value, 10);
        const newText = editTaskText.value.trim();
        const newMinutes = parseInt(editTaskMinutes.value, 10);

        if (!newText) return;

        const task = tasks.find(t => t.id === id);
        if (task) {
            task.text = newText;
            const oldMinutes = task.minutes;
            const newMinutesValue = isNaN(newMinutes) ? null : newMinutes;
            
            if (oldMinutes !== newMinutesValue) {
                if (task.timerId) clearInterval(task.timerId);
                task.minutes = newMinutesValue;
                task.remainingSeconds = newMinutesValue ? newMinutesValue * 60 : null;
                task.endTime = null; // Reset end time on edit
                task.timerId = null;
                task.isRunning = false;
            }
        }

        hideEditModal();
        saveTasksToStorage();
        renderTasks();
    }

    function playNotificationSound() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
        oscillator.start(now);
        oscillator.stop(now + 1.5);
    }

    // ★★★ FIXED: Start/Stop Logic using Timestamps ★★★
    function handleTimerToggle(id) {
        const task = tasks.find(t => t.id === id);
        if (!task || task.minutes === null) return;

        if (task.isRunning) {
            // --- STOPPING ---
            clearInterval(task.timerId);
            task.timerId = null;
            task.isRunning = false;
            task.endTime = null; // Clear the end time target because we are pausing
            saveTasksToStorage(); // Save the current remainingSeconds
        } else {
            // --- STARTING ---
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') audioContext.resume();
            
            if (!task.remainingSeconds || task.remainingSeconds <= 0) {
                task.remainingSeconds = task.minutes * 60;
            }

            // Set the absolute End Time (Now + Remaining Seconds)
            const now = Date.now();
            task.endTime = now + (task.remainingSeconds * 1000);

            task.isRunning = true;
            task.timerId = setInterval(() => timerTick(id), 1000);
            saveTasksToStorage(); // Save that we started and the endTime
        }
        renderTasks();
    }

    // ★★★ FIXED: Timer Tick Logic ★★★
    function timerTick(id) {
        const task = tasks.find(t => t.id === id);
        if (!task || !task.isRunning) return;

        // Instead of just --, we calculate diff from endTime
        const now = Date.now();
        if (task.endTime) {
            const diff = Math.ceil((task.endTime - now) / 1000);
            task.remainingSeconds = diff;
        } else {
            // Fallback if something weird happens
            task.remainingSeconds--; 
        }

        const taskElement = document.querySelector(`li[data-id="${id}"] .timer-display`);
        if (taskElement) {
            taskElement.textContent = `Time: ${formatTime(task.remainingSeconds)}`;
        }

        if (task.remainingSeconds <= 0) {
            // Time's up
            clearInterval(task.timerId);
            task.timerId = null;
            task.isRunning = false;
            task.endTime = null;
            task.remainingSeconds = task.minutes * 60; 
            task.completed = true;

            playNotificationSound();
            showNotificationModal(task.text);
            saveTasksToStorage();
            renderTasks();
        }
    }
    
    function showNotificationModal(taskText) {
        notificationText.textContent = `Your time for "${taskText}" is up.`;
        notificationModal.classList.add('flex');
        notificationOkBtn.focus();
    }

    function hideNotificationModal() {
        notificationModal.classList.remove('flex');
    }

    taskForm.addEventListener('submit', handleAddTask);
    editForm.addEventListener('submit', handleSaveEdit);
    editCancelBtn.addEventListener('click', hideEditModal);
    notificationOkBtn.addEventListener('click', hideNotificationModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideEditModal();
            hideNotificationModal();
        }
    });

    const filterAllBtn = document.getElementById('filter-all');
    const filterActiveBtn = document.getElementById('filter-active');
    const filterCompletedBtn = document.getElementById('filter-completed');

    function setFilter(filter) {
        currentFilter = filter;
        filterAllBtn.setAttribute('aria-pressed', filter === 'all');
        filterActiveBtn.setAttribute('aria-pressed', filter === 'active');
        filterCompletedBtn.setAttribute('aria-pressed', filter === 'completed');
        renderTasks();
    }

    filterAllBtn.addEventListener('click', () => setFilter('all'));
    filterActiveBtn.addEventListener('click', () => setFilter('active'));
    filterCompletedBtn.addEventListener('click', () => setFilter('completed'));

    function saveTasksToStorage() {
        try {
            const copy = tasks.map(t => ({
                id: t.id,
                text: t.text,
                minutes: t.minutes,
                remainingSeconds: t.remainingSeconds,
                endTime: t.endTime, // ★ Save the endTime!
                isRunning: t.isRunning, // Save running state so we know to resume on reload
                completed: !!t.completed
            }));
            localStorage.setItem('todo-tasks', JSON.stringify(copy));
        } catch (err) {
            console.warn('Could not save tasks', err);
        }
    }

    // ★★★ FIXED: Load Logic to Resume Timers ★★★
    function loadTasksFromStorage() {
        try {
            const raw = localStorage.getItem('todo-tasks');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            tasks = parsed.map(p => {
                const task = {
                    id: p.id,
                    text: p.text,
                    minutes: p.minutes,
                    remainingSeconds: p.remainingSeconds,
                    endTime: p.endTime || null,
                    timerId: null,
                    isRunning: false, // Start false, verify below
                    completed: !!p.completed
                };

                // Check if this task was running and should resume
                if (p.isRunning && p.endTime) {
                    const now = Date.now();
                    if (p.endTime > now) {
                        // Timer is still valid, resume it!
                        task.isRunning = true;
                        // Recalculate remaining time instantly
                        task.remainingSeconds = Math.ceil((p.endTime - now) / 1000);
                        // Start the tick
                        task.timerId = setInterval(() => timerTick(task.id), 1000);
                    } else {
                        // Timer expired while page was closed!
                        task.remainingSeconds = 0;
                        task.isRunning = false;
                        task.endTime = null;
                        task.completed = true;
                        // Note: Sound won't play automatically on load due to browser policies, 
                        // but we can show the state as done.
                    }
                }
                
                return task;
            });
        } catch (err) {
            console.warn('Could not load tasks', err);
        }
    }

    loadTasksFromStorage();
    renderTasks();
});