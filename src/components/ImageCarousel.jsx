import { useCallback, useEffect, useRef, useState } from 'react';

const INTERVAL_MS = 3000;

export default function ImageCarousel({ slides = [], children }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const count = slides.length;

  const go = useCallback(
    (dir) => {
      if (!count) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  const goTo = useCallback((i) => setIndex(i), []);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const id = setInterval(() => go(1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [count, paused, go, index]);

  useEffect(() => {
    const onHide = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  function onPointerDown(e) {
    if (e.target.closest('a, button')) return;
    touchStartX.current = e.clientX;
  }

  function onPointerUp(e) {
    if (touchStartX.current == null) return;
    const dx = e.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? 1 : -1);
  }

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        touchStartX.current = null;
      }}
    >
      <div className="hero-slides" aria-hidden={Boolean(children)}>
        {slides.map((slide, i) => (
          <figure
            key={slide.src}
            className={`hero-slide${i === index ? ' on' : ''}`}
          >
            <img src={slide.src} alt={children ? '' : slide.alt || ''} />
          </figure>
        ))}
      </div>
      <div className="hero-scrim" />

      {children && <div className="hero-content">{children}</div>}

      {count > 1 && (
        <>
          <button
            type="button"
            className="carousel-nav prev"
            aria-label="Foto sebelumnya"
            onClick={() => go(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel-nav next"
            aria-label="Foto berikutnya"
            onClick={() => go(1)}
          >
            ›
          </button>
          <div className="carousel-dots" role="tablist" aria-label="Pilih foto">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-label={`Foto ${i + 1}`}
                aria-selected={i === index}
                className={i === index ? 'on' : ''}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
