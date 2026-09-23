import { company } from '../content/company.js';

export default function Proses() {
  return (
    <div className="wrap page">
      <p className="kicker">Pengolahan</p>
      <h1>Proses kopi</h1>
      <p className="lede">{company.proses.pengantar}</p>
      <div className="steps">
        {company.proses.langkah.map((step, i) => (
          <article className="step" key={step.judul}>
            <div className="step-num">{String(i + 1).padStart(2, '0')}</div>
            <div>
              <h3>{step.judul}</h3>
              <p>{step.teks}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
