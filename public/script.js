const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });
}

// Signup
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        const res = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        document.getElementById('signupMessage').textContent = data.message || 'Error';
    });
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            window.location.href = 'dashboard.html';
        } else {
            document.getElementById('loginMessage').textContent = data.message;
        }
    });
}

// Upload Bot
const uploadBotForm = document.getElementById('uploadBotForm');
if (uploadBotForm) {
    uploadBotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('botName').value;
        const repoLink = document.getElementById('botRepo').value;
        const logo = document.getElementById('botLogo').value;

        const res = await fetch('/upload-bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, repoLink, logo })
        });
        const data = await res.json();
        document.getElementById('uploadMessage').textContent = data.message;
        loadBots();
    });
}

// Load Bots
async function loadBots() {
    const res = await fetch('/bots');
    const bots = await res.json();
    const botGrid = document.getElementById('botGrid');
    if (botGrid) {
        botGrid.innerHTML = '';
        bots.forEach(bot => {
            botGrid.innerHTML += `
                <div class="bot-card">
                    <img src="${bot.logo}" alt="${bot.name}">
                    <h3>${bot.name}</h3>
                    <a href="${bot.repoLink}" target="_blank">View Repo</a>
                </div>
            `;
        });
    }
}
if (document.getElementById('botGrid')) loadBots();
