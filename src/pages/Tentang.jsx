import { company } from '../content/company';

export default function Tentang() {
  return (
    <div className="wrap">
      <p className="note">TODO: teks sementara — ganti di src/content/company.js</p>
      <h1>Tentang {company.nama}</h1>
      <div className="prose">
        {(company.tentang || []).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}
