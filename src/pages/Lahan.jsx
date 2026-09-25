import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchPolygon } from '../api/walida';
import PetaniAvatar from '../components/PetaniAvatar';
import { formatHa, formatKg, formatMeter } from '../utils/format';
import {
  availableStock,
  displayName,
  isSoldOut,
  landAreaHa,
  petaniNama,
  processNames,
} from '../utils/polygon';

export default function Lahan() {
  const { idPolygon } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchPolygon(idPolygon)
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Gagal memuat data petak.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idPolygon]);

  if (loading) {
    return (
      <div className="wrap">
        <p className="lede">Memuat data petak…</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="wrap">
        <h1>Data petak</h1>
        <p className="status-box error">{error || 'Petak tidak ditemukan.'}</p>
        <Link className="btn" to="/peta">
          Kembali ke peta
        </Link>
      </div>
    );
  }

  const proses = processNames(item);
  const stock = availableStock(item);
  const soldOut = isSoldOut(item);
  const pembeli = Array.isArray(item.pembeliBooking) ? item.pembeliBooking : [];
  const namaPetani = petaniNama(item);
  const canBook =
    !soldOut &&
    stock != null &&
    stock > 0 &&
    item.hargaPerKg != null &&
    Number(item.hargaPerKg) > 0;

  return (
    <div className="wrap booking-wrap">
      <p className="kicker">E-commerce lahan</p>
      <h1>{displayName(item)}</h1>
      <p className="lede">{item.idPolygon}</p>

      <div className="petani-hero">
        <PetaniAvatar item={item} size="lg" />
        <div className="petani-block-text">
          <span className="petani-label">Petani</span>
          <strong>{namaPetani || '—'}</strong>
          {item.idPetani ? <span className="petani-id">{item.idPetani}</span> : null}
        </div>
      </div>

      <div className="info-grid">
        <div>
          <span>Jumlah cherry</span>
          <strong>{formatKg(item.jumlahCherry)}</strong>
        </div>
        <div>
          <span>Potential GB (kapasitas)</span>
          <strong>{formatKg(item.potentialGb)}</strong>
        </div>
        <div>
          <span>Potential GB tersedia</span>
          <strong>{stock == null ? '—' : formatKg(stock)}</strong>
        </div>
        <div>
          <span>Varietas</span>
          <strong>{item.varietas || '—'}</strong>
        </div>
        <div>
          <span>Proses pengolahan</span>
          <strong>{proses.length ? proses.join(', ') : '—'}</strong>
        </div>
        <div>
          <span>MDPL</span>
          <strong>{formatMeter(item.mdpl)}</strong>
        </div>
        <div>
          <span>Luas lahan</span>
          <strong>{formatHa(landAreaHa(item))}</strong>
        </div>
        <div>
          <span>Status booking</span>
          <strong className={soldOut ? 'text-habis' : 'text-ok'}>
            {soldOut ? 'Habis' : item.statusBooking || 'Tersedia'}
          </strong>
        </div>
      </div>

      {pembeli.length > 0 ? (
        <section className="section-block">
          <h2>Pembeli booking</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama pembeli</th>
                  <th>Proses pengolahan</th>
                  <th>Jumlah (kg)</th>
                </tr>
              </thead>
              <tbody>
                {pembeli.map((p, i) => (
                  <tr key={p.idPembelian || `${p.namaPembeli}-${i}`}>
                    <td>{p.namaPembeli || '—'}</td>
                    <td>{p.prosesPengolahan || '—'}</td>
                    <td>{formatKg(p.jumlahPesananKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="actions">
        <button
          type="button"
          className="btn"
          disabled={!canBook}
          onClick={() =>
            navigate(`/lahan/${encodeURIComponent(item.idPolygon)}/booking`)
          }
        >
          Book
        </button>
        <Link className="btn btn-ghost" to="/peta">
          Kembali ke peta
        </Link>
      </div>
      {!canBook ? (
        <p className="form-hint">
          {soldOut || (stock != null && stock <= 0)
            ? 'Stok Potential GB tersedia sudah habis.'
            : item.hargaPerKg == null || Number(item.hargaPerKg) <= 0
              ? 'Harga per kg belum diisi di sistem admin. Booking belum bisa dilakukan.'
              : 'Booking belum tersedia untuk petak ini.'}
        </p>
      ) : null}
    </div>
  );
}
