// State variables
let tasks = [];
let currentStatusFilter = "all";       // "all" | "pending" | "completed"
let currentPriorityFilter = "all";     // "all" | "high" | "medium" | "low"

// DOM Elements
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyMessage = document.getElementById("emptyMessage");
const clearAllBtn = document.getElementById("clearAllBtn");
const activeFilterIndicator = document.getElementById("activeFilterIndicator");

// Counter elements
const countAll = document.getElementById("countAll");
const countPending = document.getElementById("countPending");
const countCompleted = document.getElementById("countCompleted");

// Filter controls
const statusFilters = document.getElementById("statusFilters");
const priorityFilter = document.getElementById("priorityFilter");

// Priority metadata helper
const PRIORITY_META = {
    high: { label: "High", emoji: "🔴" },
    medium: { label: "Medium", emoji: "🟡" },
    low: { label: "Low", emoji: "🟢" }
};

// Generate unique ID for each task
function generateId() {
    return "task_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

// Load and migrate saved tasks from localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks !== null) {
        try {
            const parsed = JSON.parse(savedTasks);
            if (Array.isArray(parsed)) {
                tasks = parsed.map(function(item) {
                    // Backwards compatibility for plain string tasks
                    if (typeof item === "string") {
                        let cleanText = item.replace(/\d{1,2}:\d{2}\s?(AM|PM|am|pm)$/i, "").trim();
                        return {
                            id: generateId(),
                            text: cleanText,
                            completed: false,
                            priority: "medium",
                            addedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            submittedAt: new Date().toISOString()
                        };
                    }
                    // Handle object format
                    let cleanText = typeof item.text === "string" ? item.text.replace(/\d{1,2}:\d{2}\s?(AM|PM|am|pm)$/i, "").trim() : "";
                    return {
                        id: item.id || generateId(),
                        text: cleanText,
                        completed: item.completed === true, // boolean strictly true or false
                        priority: ["high", "medium", "low"].includes(item.priority) ? item.priority : "medium",
                        addedAt: item.addedAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        submittedAt: item.submittedAt || new Date().toISOString()
                    };
                });
            }
        } catch (e) {
            console.error("Failed to parse saved tasks", e);
            tasks = [];
        }
    }
}

// Save current tasks to localStorage
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Update all live task count badges
function updateCounters() {
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    const pendingCount = totalCount - completedCount;

    if (countAll) countAll.textContent = totalCount;
    if (countPending) countPending.textContent = pendingCount;
    if (countCompleted) countCompleted.textContent = completedCount;

    if (clearAllBtn) {
        clearAllBtn.disabled = totalCount === 0;
    }
}

// Update filter status text
function updateFilterIndicator(filteredCount) {
    if (!activeFilterIndicator) return;
    let statusText = currentStatusFilter.charAt(0).toUpperCase() + currentStatusFilter.slice(1);
    let priorityText = currentPriorityFilter === "all" ? "All Priorities" : `${PRIORITY_META[currentPriorityFilter]?.label || currentPriorityFilter} Priority`;
    
    activeFilterIndicator.textContent = `${statusText} • ${priorityText} (${filteredCount})`;
}

// Filter tasks based on active filters
function getFilteredTasks() {
    return tasks.filter(function(task) {
        // Status filter
        if (currentStatusFilter === "pending" && task.completed) return false;
        if (currentStatusFilter === "completed" && !task.completed) return false;

        // Priority filter
        if (currentPriorityFilter !== "all" && task.priority !== currentPriorityFilter) return false;

        return true;
    });
}

// Create single DOM element for a task
function createTaskElement(task) {
    const li = document.createElement("li");
    li.classList.add("task");
    li.setAttribute("data-id", task.id);
    if (task.completed) {
        li.classList.add("completed");
    }

    const leftSection = document.createElement("div");
    leftSection.classList.add("task-left");

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark task as completed");

    // Task content column (title + metadata)
    const contentCol = document.createElement("div");
    contentCol.classList.add("task-content-col");

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("task-title");
    titleSpan.textContent = task.text;

    const metaRow = document.createElement("div");
    metaRow.classList.add("task-meta");

    // Priority badge
    const priorityBadge = document.createElement("span");
    priorityBadge.classList.add("priority-badge", task.priority);
    priorityBadge.title = "Click to cycle priority";
    const meta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
    priorityBadge.textContent = `${meta.emoji} ${meta.label}`;

    // Time label
    const timeSpan = document.createElement("span");
    timeSpan.classList.add("task-time");
    timeSpan.textContent = task.addedAt || "";

    metaRow.appendChild(priorityBadge);
    if (task.addedAt) metaRow.appendChild(timeSpan);

    contentCol.appendChild(titleSpan);
    contentCol.appendChild(metaRow);

    leftSection.appendChild(checkbox);
    leftSection.appendChild(contentCol);

    // Actions
    const actions = document.createElement("div");
    actions.classList.add("task-actions");

    const editButton = document.createElement("button");
    editButton.classList.add("edit-btn");
    editButton.textContent = "Edit";
    editButton.title = "Edit task";

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-btn");
    deleteButton.textContent = "Delete";
    deleteButton.title = "Delete task";

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    li.appendChild(leftSection);
    li.appendChild(actions);

    // Event: Toggle Completion
    checkbox.addEventListener("change", function() {
        task.completed = checkbox.checked;
        saveTasks();
        render();
    });

    // Event: Click priority badge to quickly cycle High -> Medium -> Low
    priorityBadge.addEventListener("click", function() {
        const cycle = { high: "medium", medium: "low", low: "high" };
        task.priority = cycle[task.priority] || "medium";
        saveTasks();
        render();
    });

    // Event: Edit Task
    editButton.addEventListener("click", function() {
        const currentText = task.text;
        const newText = prompt("Edit your task description:", currentText);
        if (newText !== null && newText.trim() !== "") {
            task.text = newText.trim();
            saveTasks();
            render();
        }
    });

    // Event: Delete Task
    deleteButton.addEventListener("click", function() {
        const confirmed = confirm(`Are you sure you want to delete "${task.text}"?`);
        if (confirmed) {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            render();
        }
    });

    return li;
}

// Render the UI based on current state and filters
function render() {
    updateCounters();
    const filteredTasks = getFilteredTasks();
    updateFilterIndicator(filteredTasks.length);

    // Clear previous task list
    taskList.innerHTML = "";

    if (filteredTasks.length === 0) {
        emptyState.classList.remove("hidden");

        if (tasks.length === 0) {
            emptyTitle.textContent = "No tasks yet";
            emptyMessage.textContent = "Add your first task above to get organized and stay on track!";
        } else {
            emptyTitle.textContent = "No matching tasks";
            emptyMessage.textContent = `No tasks found matching "${currentStatusFilter}" status and "${currentPriorityFilter}" priority.`;
        }
    } else {
        emptyState.classList.add("hidden");
        filteredTasks.forEach(function(task) {
            taskList.appendChild(createTaskElement(task));
        });
    }
}

// Add a new task
function addTask() {
    const text = taskInput.value.trim();
    if (text === "") {
        alert("Please enter a task!");
        taskInput.focus();
        return;
    }

    const priority = prioritySelect ? prioritySelect.value : "medium";
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newTask = {
        id: generateId(),
        text: text,
        completed: false,
        priority: priority,
        addedAt: currentTime,
        submittedAt: new Date().toISOString()
    };

    tasks.unshift(newTask); // Add to the top of list
    saveTasks();
    render();

    taskInput.value = "";
    taskInput.focus();
}

// Clear all tasks
function clearAllTasks() {
    if (tasks.length === 0) return;

    const confirmed = confirm(`Are you sure you want to delete all ${tasks.length} task(s)? This cannot be undone.`);
    if (confirmed) {
        tasks = [];
        saveTasks();
        render();
    }
}

// Setup Event Listeners
function initEventListeners() {
    // Add task button & enter key
    if (addButton) {
        addButton.addEventListener("click", addTask);
    }
    if (taskInput) {
        taskInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                addTask();
            }
        });
    }

    // Status filter tabs (All / Pending / Completed)
    if (statusFilters) {
        statusFilters.addEventListener("click", function(e) {
            const button = e.target.closest(".filter-tab");
            if (!button) return;

            const status = button.getAttribute("data-status");
            if (!status || status === currentStatusFilter) return;

            // Update active state
            document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
            button.classList.add("active");

            currentStatusFilter = status;
            render();
        });
    }

    // Priority filter dropdown
    if (priorityFilter) {
        priorityFilter.addEventListener("change", function(e) {
            currentPriorityFilter = e.target.value;
            render();
        });
    }

    // Clear All button
    if (clearAllBtn) {
        clearAllBtn.addEventListener("click", clearAllTasks);
    }
}

// Initialize Application
loadTasks();
initEventListeners();
render();