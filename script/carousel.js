(function () {
  var root = document.getElementById("hero-carousel");
  if (!root) return;

  var slides = root.querySelectorAll(".hero-slide");
  var dots = root.querySelectorAll(".carousel-dots button");
  var prev = root.querySelector(".carousel-nav.prev");
  var next = root.querySelector(".carousel-nav.next");
  var count = slides.length;
  var index = 0;
  var paused = false;
  var timer = null;
  var startX = null;

  function show(i) {
    index = (i + count) % count;
    slides.forEach(function (slide, n) {
      slide.classList.toggle("on", n === index);
    });
    dots.forEach(function (dot, n) {
      dot.classList.toggle("on", n === index);
      dot.setAttribute("aria-selected", n === index ? "true" : "false");
    });
  }

  function start() {
    stop();
    if (count < 2 || paused) return;
    timer = setInterval(function () {
      show(index + 1);
    }, 3000);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  if (prev) prev.addEventListener("click", function () { show(index - 1); start(); });
  if (next) next.addEventListener("click", function () { show(index + 1); start(); });
  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      show(i);
      start();
    });
  });

  root.addEventListener("mouseenter", function () {
    paused = true;
    stop();
  });
  root.addEventListener("mouseleave", function () {
    paused = false;
    start();
  });
  document.addEventListener("visibilitychange", function () {
    paused = document.hidden;
    if (paused) stop();
    else start();
  });

  root.addEventListener("pointerdown", function (e) {
    if (e.target.closest("a, button")) return;
    startX = e.clientX;
  });
  root.addEventListener("pointerup", function (e) {
    if (startX == null) return;
    var dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) < 40) return;
    show(index + (dx < 0 ? 1 : -1));
    start();
  });
  root.addEventListener("pointercancel", function () {
    startX = null;
  });

  show(0);
  start();
})();
