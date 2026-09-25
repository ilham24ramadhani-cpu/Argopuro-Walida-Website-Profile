import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchPolygon } from '../api/walida';
import { formatKg } from '../utils/format';
import {
  availableStock,
  displayName,
  petaniNama,
  processNames,
} from '../utils/polygon';
import { saveBookingDraft } from '../utils/bookingDraft';

export default function BookingForm() {
  const { idPolygon } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState('');
  const [proses, setProses] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPolygon(idPolygon)
      .then((data) => {
        if (cancelled) return;
        setItem(data);
        const names = processNames(data);
        if (names.length === 1) setProses(names[0]);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Gagal memuat petak.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idPolygon]);

  const stock = availableStock(item);
  const prosesList = useMemo(() => processNames(item), [item]);
  const harga = item?.hargaPerKg != null ? Number(item.hargaPerKg) : null;
  const qtyNum = Number(qty);
  const productPrice =
    harga != null && !Number.isNaN(qtyNum) && qtyNum > 0 ? qtyNum * harga : null;

  const onSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!item) return;
    if (!proses) {
      setFormError('Pilih proses pengolahan.');
      return;
    }
    if (!prosesList.includes(proses)) {
      setFormError('Proses pengolahan tidak valid untuk petak ini.');
      return;
    }
    if (!(qtyNum > 0)) {
      setFormError('Jumlah GB harus lebih dari 0.');
      return;
    }
    if (stock != null && qtyNum > stock) {
      setFormError(`Jumlah melebihi stok tersedia (${formatKg(stock)}).`);
      return;
    }
    if (harga == null || harga <= 0) {
      setFormError('Harga per kg belum diisi admin.');
      return;
    }

    saveBookingDraft({
      idPolygon: item.idPolygon,
      namaPolygon: displayName(item),
      jumlahPesananKg: qtyNum,
      prosesPengolahan: proses,
      varietas: item.varietas || '',
      hargaPerKg: harga,
      productPrice,
    });
    navigate(`/lahan/${encodeURIComponent(item.idPolygon)}/checkout`);
  };

  if (loading) {
    return (
      <div className="wrap">
        <p className="lede">Memuat…</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="wrap">
        <h1>Booking</h1>
        <p className="status-box error">{error || 'Petak tidak ditemukan.'}</p>
        <Link className="btn" to="/peta">
          Kembali ke peta
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap booking-wrap">
      <p className="kicker">Booking</p>
      <h1>{displayName(item)}</h1>
      <p className="lede">
        {[petaniNama(item), `Stok tersedia: ${stock == null ? '—' : formatKg(stock)}`]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <form className="booking-form" onSubmit={onSubmit}>
        <label>
          Proses pengolahan
          <select value={proses} onChange={(e) => setProses(e.target.value)} required>
            <option value="">Pilih proses</option>
            {prosesList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label>
          Jumlah GB (kg)
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={stock ?? undefined}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Contoh: 10"
            required
          />
        </label>

        {formError ? <p className="form-error">{formError}</p> : null}

        <div className="actions">
          <button type="submit" className="btn">
            Check Out
          </button>
          <Link
            className="btn btn-ghost"
            to={`/lahan/${encodeURIComponent(item.idPolygon)}`}
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
