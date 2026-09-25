import { company } from '../content/company';

export default function Proses() {
  const { pengantar, langkah } = company.proses || {};

  return (
    <div className="wrap">
      <p className="note">TODO: narasi proses untuk pengunjung — edit di company.js</p>
      <h1>Proses kopi</h1>
      {pengantar ? <p className="lede">{pengantar}</p> : null}
      <div className="steps">
        {(langkah || []).map((step, i) => (
          <article className="step" key={step.judul}>
            <div className="step-num">{i + 1}</div>
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
