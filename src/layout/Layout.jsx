import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { company } from '../content/company.js';

const links = [
  { to: '/', label: 'Beranda' },
  { to: '/tentang', label: 'Tentang' },
  { to: '/proses', label: 'Proses' },
  { to: '/peta', label: 'Peta kebun' },
  { to: '/kontak', label: 'Kontak' },
];

function Logo() {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="brand-mark">AW</span>;
  }
  return (
    <img
      src="/logo.png"
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isMap = pathname === '/peta';

  return (
    <div className={`site${isMap ? ' map-mode' : ''}`}>
      <header className="nav">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <Logo />
          <span className="brand-name">{company.nama}</span>
        </NavLink>
        <button
          className="nav-toggle"
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
        <nav className={`nav-links${open ? ' open' : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className={isMap ? 'main-map' : 'main'}>
        <Outlet />
      </div>
      {!isMap && (
        <footer className="footer">{company.nama} · {company.bidang}</footer>
      )}
    </div>
  );
}
