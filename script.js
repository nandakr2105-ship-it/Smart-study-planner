// StudyFlow — beginner-friendly study planner.
// Data is stored locally in this browser using localStorage.

const STORAGE_KEY = "studyflow-planner-v1";
const defaultData = { topics: [], sessions: [] };
let data = loadData();
let activeFilter = "All";

const $ = (selector) => document.querySelector(selector);

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.topics) && Array.isArray(saved.sessions)) return saved;
  } catch (error) {
    console.warn("Could not load saved planner data.", error);
  }
  return structuredClone(defaultData);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatDate(dateString) {
  if (!dateString) return "No deadline";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function getDueLabel(dateString) {
  if (!dateString) return "No deadline";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateString}T00:00:00`);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return `Overdue · ${formatDate(dateString)}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${formatDate(dateString)}`;
}

function renderTopics() {
  const list = $("#topic-list");
  const search = $("#topic-search").value.trim().toLowerCase();
  list.innerHTML = "";

  const visible = data.topics.filter((topic) => {
    const matchesFilter = activeFilter === "All" ||
      (activeFilter === "Pending" && !topic.completed) ||
      (activeFilter === "Completed" && topic.completed);
    const matchesSearch = `${topic.name} ${topic.subject}`.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  visible.forEach((topic) => {
    const row = document.createElement("div");
    row.className = `topic-row${topic.completed ? " done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "topic-check";
    checkbox.checked = topic.completed;
    checkbox.setAttribute("aria-label", `Mark ${topic.name} complete`);
    checkbox.addEventListener("change", () => toggleTopic(topic.id));

    const details = document.createElement("div");
    const name = document.createElement("div");
    name.className = "topic-name";
    name.textContent = topic.name;
    const meta = document.createElement("div");
    meta.className = "topic-meta";
    const subject = document.createElement("span");
    subject.textContent = topic.subject;
    const due = document.createElement("span");
    due.textContent = getDueLabel(topic.dueDate);
    meta.append(subject, due);
    details.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "topic-actions";
    const badge = document.createElement("span");
    badge.className = `badge ${topic.priority}`;
    badge.textContent = topic.priority;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${topic.name}`);
    remove.addEventListener("click", () => deleteTopic(topic.id));
    actions.append(badge, remove);

    row.append(checkbox, details, actions);
    list.append(row);
  });

  $("#topic-empty").hidden = visible.length > 0;
}

function renderSessions() {
  const list = $("#session-list");
  list.innerHTML = "";
  data.sessions.slice(0, 5).forEach((session) => {
    const row = document.createElement("div");
    row.className = "session-row";
    const subject = document.createElement("span");
    subject.textContent = session.subject;
    const duration = document.createElement("span");
    duration.textContent = `${session.minutes} min · ${formatDate(session.date)}`;
    row.append(subject, duration);
    list.append(row);
  });
}

function renderStats() {
  const completed = data.topics.filter((topic) => topic.completed).length;
  const remaining = data.topics.length - completed;
  const totalMinutes = data.sessions.reduce((sum, session) => sum + session.minutes, 0);
  const percent = data.topics.length ? Math.round((completed / data.topics.length) * 100) : 0;

  $("#completed-stat").textContent = completed;
  $("#remaining-stat").textContent = remaining;
  $("#hours-stat").textContent = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : `${totalMinutes}m`;
  $("#progress-stat").textContent = `${percent}%`;
  $("#overall-progress").style.width = `${percent}%`;
}

function renderInsight() {
  const pending = data.topics.filter((topic) => !topic.completed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = pending.filter((topic) => topic.dueDate && new Date(`${topic.dueDate}T00:00:00`) < today);
  const dueSoon = pending.filter((topic) => {
    if (!topic.dueDate) return false;
    const days = (new Date(`${topic.dueDate}T00:00:00`) - today) / 86400000;
    return days >= 0 && days <= 3;
  });
  const highPriority = pending.filter((topic) => topic.priority === "High");

  if (!pending.length && data.topics.length) {
    $("#insight-title").textContent = "Everything is complete!";
    $("#insight-text").textContent = "You have finished every topic in your planner. Add new learning goals when you're ready.";
  } else if (overdue.length) {
    $("#insight-title").textContent = `${overdue.length} overdue topic${overdue.length > 1 ? "s" : ""}`;
    $("#insight-text").textContent = `Consider reviewing "${overdue[0].name}" and updating your plan.`;
  } else if (dueSoon.length) {
    $("#insight-title").textContent = "A deadline is approaching";
    $("#insight-text").textContent = `"${dueSoon[0].name}" is due soon. Try giving it a study session today.`;
  } else if (highPriority.length) {
    $("#insight-title").textContent = "Start with high priority";
    $("#insight-text").textContent = `Your next suggested topic is "${highPriority[0].name}".`;
  } else if (pending.length) {
    $("#insight-title").textContent = "You're ready to begin";
    $("#insight-text").textContent = `You have ${pending.length} pending topic${pending.length > 1 ? "s" : ""}. Choose one and make a little progress today.`;
  } else {
    $("#insight-title").textContent = "Your plan starts here";
    $("#insight-text").textContent = "Add a few topics and StudyFlow will highlight what needs your attention.";
  }
}

function render() {
  renderTopics();
  renderSessions();
  renderStats();
  renderInsight();
}

function toggleTopic(id) {
  data.topics = data.topics.map((topic) =>
    topic.id === id ? { ...topic, completed: !topic.completed } : topic
  );
  saveData();
  render();
}

function deleteTopic(id) {
  data.topics = data.topics.filter((topic) => topic.id !== id);
  saveData();
  render();
  showToast("Topic deleted");
}

$("#show-topic-form").addEventListener("click", () => {
  $("#topic-form").hidden = !$("#topic-form").hidden;
  if (!$("#topic-form").hidden) $("#topic-name").focus();
});

$("#cancel-topic").addEventListener("click", () => {
  $("#topic-form").reset();
  $("#topic-form").hidden = true;
});

$("#topic-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#topic-name").value.trim();
  const subject = $("#topic-subject").value.trim();
  if (!name || !subject) return;

  data.topics.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    subject,
    dueDate: $("#topic-date").value,
    priority: $("#topic-priority").value,
    completed: false
  });
  saveData();
  $("#topic-form").reset();
  $("#topic-form").hidden = true;
  render();
  showToast("Topic added to your plan");
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((item) =>
      item.classList.toggle("active", item === button)
    );
    renderTopics();
  });
});

$("#topic-search").addEventListener("input", renderTopics);

$("#session-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const subject = $("#session-subject").value.trim();
  const minutes = Number($("#session-duration").value);
  if (!subject || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    showToast("Enter a duration between 1 and 1440 minutes");
    return;
  }

  data.sessions.unshift({
    id: Date.now(),
    subject,
    minutes,
    date: new Date().toISOString().slice(0, 10)
  });
  saveData();
  $("#session-form").reset();
  render();
  showToast("Study session logged");
});

$("#export-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "studyflow-backup.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Your planner backup is ready");
});

$("#reset-data").addEventListener("click", () => {
  if (!confirm("Delete all topics and study sessions? This cannot be undone.")) return;
  data = structuredClone(defaultData);
  saveData();
  render();
  showToast("Planner data reset");
});

$("#today-label").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "short", day: "numeric", month: "long", year: "numeric"
});

render();
