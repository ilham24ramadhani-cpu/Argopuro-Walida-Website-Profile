import { company } from '../content/company.js';
import { hasText } from '../utils/format.js';

export default function Kontak() {
  const { nama, alamat, telepon, email, sosial } = company.kontak;
  const sosialItems = Object.entries(sosial || {}).filter(([, url]) => hasText(url));
  const rows = [
    hasText(nama) && { label: 'Nama', value: nama },
    hasText(alamat) && { label: 'Alamat', value: alamat },
    hasText(telepon) && { label: 'Telepon', value: telepon, href: `tel:${telepon}` },
    hasText(email) && { label: 'Email', value: email, href: `mailto:${email}` },
  ].filter(Boolean);

  const hasContact = hasText(alamat) || hasText(telepon) || hasText(email) || sosialItems.length > 0;

  return (
    <div className="wrap page">
      <p className="kicker">Hubungi kami</p>
      <h1>Kontak</h1>
      {hasContact ? (
        <ul className="contact-list">
          {rows.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              {row.href ? <a href={row.href}>{row.value}</a> : row.value}
            </li>
          ))}
          {sosialItems.map(([name, url]) => (
            <li key={name}>
              <span>{name}</span>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="contact-empty">
          {hasText(nama) ? `${nama}. ` : ''}Alamat, telepon, dan email akan ditampilkan di halaman ini setelah dilengkapi.
        </p>
      )}
    </div>
  );
}
