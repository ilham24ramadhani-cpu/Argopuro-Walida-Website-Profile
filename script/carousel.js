document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('hero-carousel');
  if (!root) return;
  const slides = Array.from(root.querySelectorAll('.hero-slide'));
  const dots = Array.from(root.querySelectorAll('[data-carousel-dot]'));
  if (slides.length < 2) return;

  let index = 0;
  let timer = null;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((el, n) => el.classList.toggle('on', n === index));
    dots.forEach((el, n) => el.classList.toggle('on', n === index));
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show(index + 1), 5500);
  }

  root.querySelectorAll('[data-carousel-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      show(index + Number(btn.getAttribute('data-carousel-dir')));
      restart();
    });
  });
  dots.forEach((btn) => {
    btn.addEventListener('click', () => {
      show(Number(btn.getAttribute('data-carousel-dot')));
      restart();
    });
  });

  restart();
});
