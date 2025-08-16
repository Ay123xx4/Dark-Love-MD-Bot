(function(){
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') {
    document.body.classList.add('dark');
    btn.textContent = '🌙';
  } else {
    btn.textContent = '🌞';
  }
  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');
    btn.textContent = dark ? '🌙' : '🌞';
    localStorage.setItem('theme', dark ? 'dark':'light');
  });
})();
