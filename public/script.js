const API_BASE = "https://dark-love-md-bot-production.up.railway.app/";

// 🌙 Dark/Light Mode Toggle
document.addEventListener("DOMContentLoaded", () => {
  const modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      modeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
    });
  }
});

// 🟢 Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      window.location.href = "dashboard.html";
    } else {
      document.getElementById("loginMessage").textContent = data.message || "Login failed";
    }
  });
}

// 🟢 Signup
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    document.getElementById("signupMessage").textContent = data.message || "Signup failed";
  });
}

// 🟢 Dashboard
const botGrid = document.getElementById("botGrid");
if (botGrid) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
  } else {
    const username = localStorage.getItem("username");
    document.getElementById("welcomeMsg").textContent = `Welcome, ${username}`;

    fetch(`${API_BASE}/api/bots`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(bots => {
        botGrid.innerHTML = bots.map(bot => `
          <div class="bot-card">
            <img src="${bot.logoUrl}" alt="Logo" width="100">
            <h3>${bot.name}</h3>
            <p><a href="${bot.repoUrl}" target="_blank">Visit Repo</a></p>
            <p>${bot.description || ""}</p>
            <p>Uploaded by: ${bot.owner}</p>
          </div>
        `).join("");
      });
  }
}

// 🟢 Upload Bot
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(uploadForm);

    const res = await fetch(`${API_BASE}/api/bots/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData
    });

    const data = await res.json();
    document.getElementById("uploadMessage").textContent = data.message || "Upload failed";
  });
}
