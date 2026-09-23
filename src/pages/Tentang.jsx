import { company } from '../content/company.js';

export default function Tentang() {
  return (
    <div className="wrap page">
      <p className="kicker">Profil</p>
      <h1>Tentang {company.nama}</h1>
      <div className="prose">
        {company.tentang.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}
