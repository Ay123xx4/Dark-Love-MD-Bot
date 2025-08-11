document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("uploadForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/upload-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    document.getElementById("msg").textContent = data.message;
  });
});
