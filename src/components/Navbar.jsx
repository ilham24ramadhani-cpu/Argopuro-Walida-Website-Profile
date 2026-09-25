import { NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import { company } from '../content/company';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="nav">
      <Link to="/" className="brand" onClick={close}>
        <img src="/logo.png" alt="" />
        <span className="brand-name">{company.nama}</span>
      </Link>
      <button
        className="nav-toggle"
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      <nav className={`nav-links${open ? ' open' : ''}`}>
        <NavLink to="/" end onClick={close}>
          Beranda
        </NavLink>
        <NavLink to="/tentang" onClick={close}>
          Tentang
        </NavLink>
        <NavLink to="/proses" onClick={close}>
          Proses
        </NavLink>
        <NavLink to="/peta" onClick={close}>
          Peta kebun
        </NavLink>
        <NavLink to="/kontak" onClick={close}>
          Kontak
        </NavLink>
      </nav>
    </header>
  );
}
