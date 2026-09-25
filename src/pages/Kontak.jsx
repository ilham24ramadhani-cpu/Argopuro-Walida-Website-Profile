import { company } from '../content/company';

function filled(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export default function Kontak() {
  const contact = company.kontak || {};
  const sosial = Object.entries(contact.sosial || {}).filter(([, url]) => filled(url));

  const rows = [];
  if (filled(contact.nama)) rows.push({ label: 'Nama', value: contact.nama, href: null });
  if (filled(contact.alamat)) rows.push({ label: 'Alamat', value: contact.alamat, href: null });
  if (filled(contact.telepon)) {
    rows.push({ label: 'Telepon', value: contact.telepon, href: `tel:${contact.telepon}` });
  }
  if (filled(contact.email)) {
    rows.push({ label: 'Email', value: contact.email, href: `mailto:${contact.email}` });
  }

  const hasContact = rows.some((r) => r.label !== 'Nama') || sosial.length > 0;

  return (
    <div className="wrap">
      <h1>Kontak</h1>
      {!hasContact ? (
        <div className="contact-empty">
          <p>
            Data kontak belum diisi. Lengkapi field kosong di{' '}
            <code>src/content/company.js</code> (alamat, telepon, email, sosial).
          </p>
        </div>
      ) : (
        <>
          <ul className="contact-list">
            {rows.map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                {row.href ? <a href={row.href}>{row.value}</a> : row.value}
              </li>
            ))}
          </ul>
          {sosial.length > 0 ? (
            <ul className="contact-list" style={{ marginTop: 12 }}>
              {sosial.map(([name, url]) => (
                <li key={name}>
                  <span>{name}</span>
                  <a href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
