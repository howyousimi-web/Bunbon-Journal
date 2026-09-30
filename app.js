const STORAGE = {
  profile: "bunbon-profile",
  theme: "bunbon-theme",
  journal: "bunbon-journal",
  drawing: "bunbon-drawing",
};

const profile = readJson(STORAGE.profile);
const currentPage = document.body.dataset.page;
let theme = localStorage.getItem(STORAGE.theme) || "light";

document.body.dataset.theme = theme;
updateThemeControls();
updateProfileImages();

if (currentPage !== "signup" && !profile) {
  window.location.replace("index.html");
} else {
  bindThemeToggle();
  if (currentPage === "signup") bindSignup();
  if (currentPage === "home") bindHome();
  if (currentPage === "profile") bindProfile();
  if (currentPage === "journal") bindJournal();
  if (currentPage === "doodle") bindCanvas();
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function readEntries() {
  const entries = readJson(STORAGE.journal);
  return Array.isArray(entries) ? entries : [];
}

function bindThemeToggle() {
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      theme = theme === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE.theme, theme);
      document.body.dataset.theme = theme;
      updateThemeControls();
      updateProfileImages();
    });
  });
}

function updateThemeControls() {
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const nextTheme = theme === "light" ? "dark" : "light";
    button.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
  });
}

function updateProfileImages() {
  document.querySelectorAll("[data-cat-image]").forEach((image) => {
    image.src = theme === "dark" ? image.dataset.darkImage : image.dataset.lightImage;
  });
}

function bindSignup() {
  const form = document.querySelector("#signup-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const details = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(STORAGE.profile, JSON.stringify(details));
    window.location.assign("home.html");
  });

  document.querySelector("#continue-button").addEventListener("click", () => {
    if (profile) window.location.assign("home.html");
    else document.querySelector("#student-name").focus();
  });
}

function bindHome() {
  const firstName = profile.name.trim().split(/\s+/)[0];
  document.querySelector("[data-profile-first-name]").textContent = firstName;
  document.querySelectorAll("[data-profile-field]").forEach((element) => {
    element.textContent = profile[element.dataset.profileField] || "";
  });
  document.querySelector("[data-today]").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const entries = readEntries();
  document.querySelectorAll("[data-passage-count]").forEach((element) => {
    element.textContent = entries.length;
  });
  const list = document.querySelector("#recent-passages");
  const template = document.querySelector("#recent-passage-template");
  entries.slice(0, 2).forEach((entry) => {
    const item = template.content.firstElementChild.cloneNode(true);
    item.querySelector("h3").textContent = entry.title || "Untitled passage";
    item.querySelector("p").textContent = entry.body || "A quiet page, waiting for words.";
    item.querySelector("time").textContent = formatDate(entry.updatedAt);
    list.append(item);
  });
  document.querySelector("#no-recent-passages").hidden = entries.length > 0;
}

function bindProfile() {
  document.querySelectorAll("[data-profile-field]").forEach((element) => {
    element.textContent = profile[element.dataset.profileField] || "";
  });
  document.querySelector("#signout-button").addEventListener("click", () => {
    if (!window.confirm("Sign out from this student profile on this device?")) return;
    localStorage.removeItem(STORAGE.profile);
    window.location.assign("index.html");
  });
}

function bindJournal() {
  let entries = readEntries();
  let activeId = null;
  const list = document.querySelector("#library-list");
  const template = document.querySelector("#passage-template");
  const title = document.querySelector("#entry-title");
  const body = document.querySelector("#entry-body");
  const status = document.querySelector("#save-status");
  const wordCount = document.querySelector("#word-count");
  const emptyState = document.querySelector("#empty-library");

  function updateWordCount() {
    const words = body.value.trim();
    wordCount.textContent = `${words ? words.split(/\s+/).length : 0} words`;
  }

  function renderEntries() {
    list.replaceChildren();
    document.querySelector("#passage-count").textContent = entries.length ? `(${entries.length})` : "";
    emptyState.hidden = entries.length > 0;
    entries.forEach((entry) => {
      const button = template.content.firstElementChild.cloneNode(true);
      button.dataset.entryId = entry.id;
      button.classList.toggle("selected", entry.id === activeId);
      button.querySelector("strong").textContent = entry.title || "Untitled passage";
      button.querySelector("time").textContent = formatDate(entry.updatedAt);
      button.querySelector("p").textContent = entry.body || "No words on this page yet.";
      button.addEventListener("click", () => {
        activeId = entry.id;
        title.value = entry.title || "";
        body.value = entry.body || "";
        status.textContent = "SAVED PASSAGE";
        updateWordCount();
        renderEntries();
      });
      list.append(button);
    });
  }

  document.querySelector("#new-passage").addEventListener("click", () => {
    activeId = null;
    title.value = "";
    body.value = "";
    status.textContent = "NEW PASSAGE";
    updateWordCount();
    renderEntries();
    title.focus();
  });
  title.addEventListener("input", () => { status.textContent = "UNSAVED CHANGES"; });
  body.addEventListener("input", () => {
    status.textContent = "UNSAVED CHANGES";
    updateWordCount();
  });
  document.querySelector("#save-passage").addEventListener("click", () => {
    if (!title.value.trim() && !body.value.trim()) {
      title.focus();
      return;
    }
    const updatedAt = new Date().toISOString();
    if (activeId) {
      const entry = entries.find((item) => item.id === activeId);
      entry.title = title.value.trim() || "Untitled passage";
      entry.body = body.value.trim();
      entry.updatedAt = updatedAt;
    } else {
      activeId = crypto.randomUUID();
      entries.unshift({
        id: activeId,
        title: title.value.trim() || "Untitled passage",
        body: body.value.trim(),
        updatedAt,
      });
    }
    localStorage.setItem(STORAGE.journal, JSON.stringify(entries));
    status.textContent = "SAVED JUST NOW";
    renderEntries();
  });
  document.querySelector("#clear-library").addEventListener("click", () => {
    if (!entries.length || !window.confirm("Clear every passage in your journal? This cannot be undone.")) return;
    entries = [];
    activeId = null;
    title.value = "";
    body.value = "";
    status.textContent = "LIBRARY CLEARED";
    localStorage.removeItem(STORAGE.journal);
    updateWordCount();
    renderEntries();
  });

  updateWordCount();
  renderEntries();
}

function formatDate(value) {
  if (!value) return "JUST NOW";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value)).toUpperCase();
}

function bindCanvas() {
  const canvas = document.querySelector("#drawing-board");
  const context = canvas.getContext("2d");
  const wrap = canvas.parentElement;
  let drawing = false;
  let tool = "pencil";
  let lastPoint = null;

  function restoreDrawing() {
    const saved = localStorage.getItem(STORAGE.drawing);
    const bounds = wrap.getBoundingClientRect();
    if (!saved || !bounds.width || !bounds.height) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, bounds.width, bounds.height);
    image.src = saved;
  }

  function resizeCanvas() {
    const bounds = wrap.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    restoreDrawing();
  }

  function pointFrom(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function draw(event) {
    if (!drawing) return;
    const nextPoint = pointFrom(event);
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = document.querySelector("#brush-color").value;
    context.lineWidth = Number(document.querySelector("#brush-size").value);
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();
    lastPoint = nextPoint;
  }

  function finishDrawing() {
    if (!drawing) return;
    drawing = false;
    try {
      localStorage.setItem(STORAGE.drawing, canvas.toDataURL("image/png"));
    } catch {
      // Browser storage can be full for large drawings.
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    lastPoint = pointFrom(event);
    canvas.setPointerCapture(event.pointerId);
    draw(event);
  });
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", finishDrawing);
  canvas.addEventListener("pointercancel", finishDrawing);
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      tool = button.dataset.tool;
      document.querySelectorAll("[data-tool]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
    });
  });
  document.querySelector("#brush-size").addEventListener("input", (event) => {
    document.querySelector("#size-value").textContent = event.target.value;
  });
  document.querySelector("#clear-canvas").addEventListener("click", () => {
    if (!window.confirm("Clear your doodle?")) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    localStorage.removeItem(STORAGE.drawing);
  });

  new ResizeObserver(resizeCanvas).observe(wrap);
  resizeCanvas();
}