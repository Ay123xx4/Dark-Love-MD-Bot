// public/auth.js
document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const txt = await res.text();
  const msg = document.getElementById("msg");
  if (res.ok && txt === "ok:check-email") {
    msg.style.color = "#cfeacb";
    msg.innerText = "Success — check your email for verification link.";
    form.reset();
  } else {
    msg.style.color = "#ffd6d6";
    msg.innerText = txt || "Signup failed";
  }
});

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const txt = await res.text();
  const msg = document.getElementById("msg");
  if (res.ok && txt === "ok:logged-in") {
    window.location.href = "/dashboard";
    return;
  } else {
    msg.style.color = "#ffd6d6";
    msg.innerText = txt || "Login failed";
  }
});
