import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { company } from '../content/company';

export default function HeroCarousel() {
  const slides = company.galeri || [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  const go = (dir) => {
    if (!slides.length) return;
    setIndex((i) => (i + dir + slides.length) % slides.length);
  };

  return (
    <section className="hero-carousel" aria-label="Beranda">
      <div className="hero-slides" aria-hidden="true">
        {slides.map((slide, i) => (
          <figure key={slide.file} className={`hero-slide${i === index ? ' on' : ''}`}>
            <img src={slide.file} alt="" />
          </figure>
        ))}
      </div>
      <div className="hero-scrim" />
      <div className="hero-content">
        <h1>{company.nama}</h1>
        {company.tagline ? <p className="lede hero-intro">{company.tagline}</p> : null}
        <div className="actions">
          <Link className="btn" to="/peta">
            Lihat peta kebun
          </Link>
          <Link className="btn btn-ghost" to="/tentang">
            Tentang kami
          </Link>
        </div>
      </div>
      {slides.length > 1 ? (
        <>
          <button type="button" className="carousel-nav prev" aria-label="Foto sebelumnya" onClick={() => go(-1)}>
            ‹
          </button>
          <button type="button" className="carousel-nav next" aria-label="Foto berikutnya" onClick={() => go(1)}>
            ›
          </button>
          <div className="carousel-dots" role="tablist" aria-label="Pilih foto">
            {slides.map((slide, i) => (
              <button
                key={slide.file}
                type="button"
                role="tab"
                aria-label={`Foto ${i + 1}`}
                className={i === index ? 'on' : ''}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
