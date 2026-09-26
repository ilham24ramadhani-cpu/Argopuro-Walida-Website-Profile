document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-print');
  if (btn) btn.addEventListener('click', () => window.print());
});
