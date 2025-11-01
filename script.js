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
    let tasks = []; // Array to store task objects
    // Example task: { id: Date.now(), text: 'My Task', minutes: 30, remainingSeconds: 1800, timerId: null, isRunning: false }
    let audioContext; // For playing notification sound
        let currentFilter = 'all'; // all | active | completed

    // --- Functions ---

    /**
     * Renders all tasks in the task list.
     */
    function renderTasks() {
        // Clear existing list
        taskList.innerHTML = '';

        // Apply filter
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

        // Create and append each task item
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
            checkbox.setAttribute('aria-label', `Mark ${task.text} as completed`);
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

            // Timer Button
            if (task.minutes) {
                const timerBtn = document.createElement('button');
                timerBtn.className = `timer-btn font-medium py-2 px-4 rounded-lg text-sm ${task.isRunning ? 'btn-danger' : 'btn-success'}`;
                timerBtn.textContent = task.isRunning ? 'Stop' : 'Start';
                timerBtn.addEventListener('click', () => handleTimerToggle(task.id));
                buttonsDiv.appendChild(timerBtn);
            }

            // Edit Button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn btn-secondary font-medium py-2 px-4 rounded-lg text-sm';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => showEditModal(task.id));
            buttonsDiv.appendChild(editBtn);

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn btn-danger font-medium py-2 px-4 rounded-lg text-sm';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => handleDeleteTask(task.id));
            buttonsDiv.appendChild(deleteBtn);

            // Completed badge when filtered to completed
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

        /** Update visible count */
        function updateCount() {
            const countEl = document.getElementById('task-count');
            if (!countEl) return;
            countEl.textContent = tasks.length;
        }

        /** Toggle a task as completed */
        function toggleComplete(id) {
            const task = tasks.find(t => t.id === id);
            if (!task) return;
            task.completed = !task.completed;
            saveTasksToStorage();
            renderTasks();
        }

    /**
     * Formats seconds into MM:SS string.
     */
    function formatTime(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Handles adding a new task.
     */
    function handleAddTask(event) {
        event.preventDefault();
        const text = taskTextInput.value.trim();
        const minutes = parseInt(taskMinutesInput.value, 10);

        if (!text) return; // Don't add empty tasks

        const newTask = {
            id: Date.now(),
            text: text,
            minutes: isNaN(minutes) ? null : minutes,
            remainingSeconds: isNaN(minutes) ? null : minutes * 60,
            timerId: null,
            isRunning: false
                ,completed: false
        };

        tasks.push(newTask);
            saveTasksToStorage();
            renderTasks();

        // Clear form
        taskTextInput.value = '';
        taskMinutesInput.value = '';
    }

    /**
     * Handles deleting a task.
     */
    function handleDeleteTask(id) {
        // Stop timer if it's running
        const task = tasks.find(t => t.id === id);
        if (task && task.timerId) {
            clearInterval(task.timerId);
        }
        
        tasks = tasks.filter(task => task.id !== id);
            saveTasksToStorage();
        renderTasks();
    }

    /**
     * Shows the edit modal and populates it.
     */
    function showEditModal(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        editTaskId.value = task.id;
        editTaskText.value = task.text;
        editTaskMinutes.value = task.minutes || '';
        
        editModal.classList.add('flex');
            // focus management
            editTaskText.focus();
    }

    /**
     * Hides the edit modal.
     */
    function hideEditModal() {
        editModal.classList.remove('flex');
    }

    /**
     * Handles saving changes from the edit modal.
     */
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
            
            // If timer value changed, reset the timer
            if (oldMinutes !== newMinutesValue) {
                if (task.timerId) {
                    clearInterval(task.timerId); // Stop running timer
                }
                task.minutes = newMinutesValue;
                task.remainingSeconds = newMinutesValue ? newMinutesValue * 60 : null;
                task.timerId = null;
                task.isRunning = false;
            }
        }

        hideEditModal();
            saveTasksToStorage();
            renderTasks();
    }

    /**
     * Creates and plays a simple notification beep.
     */
    function playNotificationSound() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume context if it's suspended (e.g., due to autoplay policies)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine'; // 'sine' is a much softer tone
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Lowered to 'A4' for a gentler pitch

        // Create a shorter 1.5-second beep envelope
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05); // Quick fade in (to a lower volume)
        gainNode.gain.linearRampToValueAtTime(0, now + 1.5);   // Fade out over 1.5s

        oscillator.start(now);
        oscillator.stop(now + 1.5);
    }

    /**
     * Starts or stops the timer for a task.
     */
    function handleTimerToggle(id) {
        const task = tasks.find(t => t.id === id);
        if (!task || task.minutes === null) return;

        if (task.isRunning) {
            // Stop the timer
            clearInterval(task.timerId);
            task.timerId = null;
            task.isRunning = false;
        } else {
            // Start the timer
            
            // Initialize or resume AudioContext on user gesture (starting timer)
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
                // Ensure remainingSeconds is initialized
                if (!task.remainingSeconds || task.remainingSeconds <= 0) {
                    task.remainingSeconds = task.minutes * 60;
                }
            task.isRunning = true;
            task.timerId = setInterval(() => timerTick(id), 1000);
        }
            saveTasksToStorage();
            renderTasks(); // Re-render to update button text
    }

    /**
     * Runs every second for an active timer.
     */
    function timerTick(id) {
        const task = tasks.find(t => t.id === id);
        if (!task || !task.isRunning) return;

        task.remainingSeconds--;

        // Update the timer display in the DOM directly
        const taskElement = document.querySelector(`li[data-id="${id}"] .timer-display`);
        if (taskElement) {
            taskElement.textContent = `Time: ${formatTime(task.remainingSeconds)}`;
        }

        if (task.remainingSeconds <= 0) {
            // Time's up
            clearInterval(task.timerId);
            task.timerId = null;
            task.isRunning = false;
                task.remainingSeconds = task.minutes * 60; // Reset timer
                // Optionally mark completed
                task.completed = true;

            playNotificationSound(); // Play the sound!
            showNotificationModal(task.text);
                saveTasksToStorage();
                renderTasks(); // Re-render to reset button
        }
    }
    
    /**
     * Shows the time's up notification.
     */
    function showNotificationModal(taskText) {
        notificationText.textContent = `Your time for "${taskText}" is up.`;
        notificationModal.classList.add('flex');
            notificationOkBtn.focus();
    }

    /**
     * Hides the time's up notification.
     */
    function hideNotificationModal() {
        notificationModal.classList.remove('flex');
    }

    // --- Event Listeners ---
    taskForm.addEventListener('submit', handleAddTask);
    editForm.addEventListener('submit', handleSaveEdit);
    editCancelBtn.addEventListener('click', hideEditModal);
    notificationOkBtn.addEventListener('click', hideNotificationModal);

        // Keyboard: Escape to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideEditModal();
                hideNotificationModal();
            }
        });

        // Filters
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

        // --- Persistence ---
        function saveTasksToStorage() {
            try {
                const copy = tasks.map(t => ({
                    id: t.id,
                    text: t.text,
                    minutes: t.minutes,
                    remainingSeconds: t.remainingSeconds,
                    isRunning: false, // don't persist running state
                    completed: !!t.completed
                }));
                localStorage.setItem('todo-tasks', JSON.stringify(copy));
            } catch (err) {
                console.warn('Could not save tasks', err);
            }
        }

        function loadTasksFromStorage() {
            try {
                const raw = localStorage.getItem('todo-tasks');
                if (!raw) return;
                const parsed = JSON.parse(raw);
                tasks = parsed.map(p => ({
                    id: p.id,
                    text: p.text,
                    minutes: p.minutes,
                    remainingSeconds: p.remainingSeconds,
                    timerId: null,
                    isRunning: false,
                    completed: !!p.completed
                }));
            } catch (err) {
                console.warn('Could not load tasks', err);
            }
        }

    // --- Initial Load & Render ---
    loadTasksFromStorage();
    renderTasks();
});
