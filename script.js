
const $ = id => document.getElementById(id);

const taskInput = $("taskInput");
const taskForm = $("taskForm");
const taskList = $("taskList");

let tasks = JSON.parse(localStorage.getItem("taskflowTasks")) || [];
let currentFilter = "all";

// Theme
if (localStorage.getItem("taskflowTheme") === "dark") {
    document.body.classList.add("dark");
    $("themeBtn").textContent = "☀️";
}

$("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");

    $("themeBtn").textContent = dark ? "☀️" : "🌙";

    localStorage.setItem("taskflowTheme", dark ? "dark" : "light");
});

// Today's date
$("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
});

// Save
function saveTasks() {
    localStorage.setItem("taskflowTasks", JSON.stringify(tasks));
}

// Add / Edit
taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) return;

    const editId = $("editId").value;

    if (editId) {
        const task = tasks.find(t => t.id === Number(editId));

        if (task) {
            task.text = text;
            task.priority = $("priority").value;
            task.dueDate = $("dueDate").value;
        }

        resetForm();
    } else {
        tasks.push({
            id: Date.now(),
            text,
            priority: $("priority").value,
            dueDate: $("dueDate").value,
            completed: false,
            createdAt: Date.now()
        });
    }

    saveTasks();
    renderTasks();
    taskInput.value = "";
});

// Reset form
function resetForm() {
    $("editId").value = "";
    $("formHeading").textContent = "Create New Task ✨";
    $("submitBtn").textContent = "+ Add Task";
    $("cancelEdit").classList.add("hidden");
    $("priority").value = "medium";
    $("dueDate").value = "";
    taskInput.value = "";
}

$("cancelEdit").addEventListener("click", resetForm);

// Render
function renderTasks() {
    taskList.innerHTML = "";

    const search = $("searchInput").value.toLowerCase();
    const sort = $("sortSelect").value;

    let filtered = tasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(search);

        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "active" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        return matchesSearch && matchesFilter;
    });

    // Sorting
    if (sort === "newest") {
        filtered.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (sort === "oldest") {
        filtered.sort((a, b) => a.createdAt - b.createdAt);
    }

    if (sort === "priority") {
        const rank = { high: 1, medium: 2, low: 3 };
        filtered.sort((a, b) => rank[a.priority] - rank[b.priority]);
    }

    if (sort === "due") {
        filtered.sort((a, b) => {
            return (a.dueDate || "9999") .localeCompare(b.dueDate || "9999");
        });
    }

    if (filtered.length === 0) {
        const message = tasks.length === 0
            ? "No tasks yet. Add your first task! 🎯"
            : "No matching tasks found. 🔍";

        taskList.innerHTML = `<p class="empty-message">${message}</p>`;
    }

    filtered.forEach(task => {
        const item = document.createElement("div");
        item.className = "task-item";

        const left = document.createElement("div");
        left.className = "task-left";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = task.completed;
        checkbox.dataset.action = "toggle";
        checkbox.dataset.id = task.id;

        const details = document.createElement("div");
        details.className = "task-details";

        const title = document.createElement("div");
        title.className = "task-title" + (task.completed ? " done" : "");
        title.textContent = task.text;

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const priority = document.createElement("span");
        priority.className = `priority ${task.priority}`;
        priority.textContent = task.priority.toUpperCase() + " PRIORITY";

        meta.appendChild(priority);

        if (task.dueDate) {
            const date = document.createElement("span");
            date.textContent = "📅 " + task.dueDate;

            if (!task.completed && task.dueDate < new Date().toISOString().slice(0, 10)) {
                date.textContent += " · Overdue";
            }

            meta.appendChild(date);
        }

        details.append(title, meta);
        left.append(checkbox, details);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const edit = document.createElement("button");
        edit.textContent = "✏️ Edit";
        edit.dataset.action = "edit";
        edit.dataset.id = task.id;

        const remove = document.createElement("button");
        remove.textContent = "🗑️ Delete";
        remove.dataset.action = "delete";
        remove.dataset.id = task.id;

        actions.append(edit, remove);
        item.append(left, actions);
        taskList.appendChild(item);
    });

    updateStats();
}

// Task actions
taskList.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "edit") {
        const task = tasks.find(t => t.id === id);

        if (!task) return;

        taskInput.value = task.text;
        $("editId").value = task.id;
        $("priority").value = task.priority;
        $("dueDate").value = task.dueDate || "";

        $("formHeading").textContent = "Edit Your Task ✏️";
        $("submitBtn").textContent = "Save Changes";
        $("cancelEdit").classList.remove("hidden");

        taskInput.focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "delete") {
        if (!confirm("Are you sure you want to delete this task?")) return;

        tasks = tasks.filter(t => t.id !== id);

        saveTasks();
        renderTasks();

        if (Number($("editId").value) === id) resetForm();
    }
});

// Complete task
taskList.addEventListener("change", event => {
    if (event.target.dataset.action !== "toggle") return;

    const id = Number(event.target.dataset.id);
    const task = tasks.find(t => t.id === id);

    if (task) {
        task.completed = event.target.checked;
        saveTasks();
        renderTasks();
    }
});

// Statistics
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    $("totalTasks").textContent = total;
    $("completedTasks").textContent = completed;
    $("pendingTasks").textContent = pending;
    $("progressPercent").textContent = percent + "%";

    $("progressBar").style.width = percent + "%";
    $("progressText").textContent = percent + "% completed";

    $("taskCount").textContent = `${pending} remaining · ${total} total`;
}

// Filters
document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
        renderTasks();
    });
});

// Search
$("searchInput").addEventListener("input", renderTasks);

// Sort
$("sortSelect").addEventListener("change", renderTasks);

// Clear completed
$("clearCompleted").addEventListener("click", () => {
    const completed = tasks.filter(t => t.completed).length;

    if (completed === 0) {
        alert("No completed tasks to clear!");
        return;
    }

    if (!confirm(`Delete all ${completed} completed tasks?`)) return;

    tasks = tasks.filter(t => !t.completed);

    saveTasks();
    renderTasks();
    resetForm();
});

// Initial load
renderTasks();