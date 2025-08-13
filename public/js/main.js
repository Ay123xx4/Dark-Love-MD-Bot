// Toggle Dark/Light Mode
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      toggleBtn.textContent = document.body.classList.contains("dark") ? "🌙" : "☀️";
    });
  }
});

// Login form
async function loginUser(e) {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (data.success) {
    localStorage.setItem("username", data.username);
    window.location.href = "dashboard.html";
  } else {
    alert(data.message);
  }
}

// Signup form
async function signupUser(e) {
  e.preventDefault();
  const username = document.getElementById("signupUsername").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  const res = await fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  alert(data.message);
}

// Fetch bots
async function loadBots() {
  const container = document.getElementById("botContainer");
  if (!container) return;
  const res = await fetch("/bots");
  const bots = await res.json();
  container.innerHTML = bots.map(bot => `
    <div class="bot-card">
      <img src="${bot.logoUrl}" alt="${bot.name}">
      <h3>${bot.name}</h3>
      <p><a href="${bot.repoLink}" target="_blank">Repo Link</a></p>
      <button onclick="deleteBot('${bot._id}')">Delete</button>
    </div>
  `).join("");
}

// Upload bot
async function uploadBot(e) {
  e.preventDefault();
  const formData = new FormData(document.getElementById("uploadForm"));
  formData.append("username", localStorage.getItem("username"));

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();
  alert(data.message);
  if (data.success) window.location.href = "dashboard.html";
}

// Delete bot
async function deleteBot(id) {
  const password = prompt("Enter your password to confirm delete:");
  const username = localStorage.getItem("username");

  const res = await fetch("/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ botId: id, username, password })
  });
  const data = await res.json();
  alert(data.message);
  if (data.success) loadBots();
}
