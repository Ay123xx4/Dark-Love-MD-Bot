document.addEventListener("DOMContentLoaded", () => {
  const botGrid = document.getElementById("botGrid");
  const searchInput = document.getElementById("searchInput");
  const themeToggle = document.getElementById("themeToggle");

  // Fetch bots from backend
  async function fetchBots() {
    try {
      const res = await fetch("/public-bots");
      const bots = await res.json();
      displayBots(bots);

      searchInput.addEventListener("input", () => {
        const filtered = bots.filter(bot =>
          bot.name.toLowerCase().includes(searchInput.value.toLowerCase())
        );
        displayBots(filtered);
      });
    } catch (err) {
      console.error("Error loading bots:", err);
    }
  }

  // Display bots in grid
  function displayBots(bots) {
    botGrid.innerHTML = "";
    bots.forEach(bot => {
      const card = document.createElement("div");
      card.classList.add("bot-card");
      card.innerHTML = `
        <img src="${bot.logo}" alt="${bot.name}" class="bot-logo">
        <h3>${bot.name}</h3>
        <p><a href="${bot.repo}" target="_blank">View Repository</a></p>
      `;
      botGrid.appendChild(card);
    });
  }

  // Dark/Light mode toggle
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark")
      ? "☀️ Light Mode"
      : "🌙 Dark Mode";
  });

  fetchBots();
});
