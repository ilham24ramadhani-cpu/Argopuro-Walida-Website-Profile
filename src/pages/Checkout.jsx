import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createBooking, fetchPolygon } from '../api/walida';
import { KETERANGAN_PEMBAYARAN } from '../content/payment';
import { formatKg, formatRp } from '../utils/format';
import { displayName } from '../utils/polygon';
import {
  clearBookingDraft,
  loadBookingDraft,
  saveLastInvoice,
} from '../utils/bookingDraft';

export default function Checkout() {
  const { idPolygon } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [item, setItem] = useState(null);
  const [namaPembeli, setNamaPembeli] = useState('');
  const [kontakPembeli, setKontakPembeli] = useState('');
  const [alamatPembeli, setAlamatPembeli] = useState('');
  const [catatanPemesanan, setCatatanPemesanan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = loadBookingDraft();
    if (!d || d.idPolygon !== idPolygon) {
      setDraft(null);
      return;
    }
    setDraft(d);
    fetchPolygon(idPolygon)
      .then(setItem)
      .catch(() => {});
  }, [idPolygon]);

  if (!draft) {
    return (
      <div className="wrap">
        <h1>Checkout</h1>
        <p className="status-box error">
          Data booking tidak ditemukan. Mulai ulang dari halaman petak.
        </p>
        <Link className="btn" to={`/lahan/${encodeURIComponent(idPolygon)}`}>
          Kembali ke petak
        </Link>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!namaPembeli.trim() || !kontakPembeli.trim() || !alamatPembeli.trim()) {
      setError('Nama, kontak, dan alamat pembeli wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        idPolygon: draft.idPolygon,
        jumlahPesananKg: draft.jumlahPesananKg,
        prosesPengolahan: draft.prosesPengolahan,
        namaPembeli: namaPembeli.trim(),
        kontakPembeli: kontakPembeli.trim(),
        alamatPembeli: alamatPembeli.trim(),
        tipePemesanan: 'E-commerce',
        tipeProduk: 'Green Beans',
        biayaPengiriman: 0,
        biayaPajak: 0,
        tipePajak: 'penjumlahan',
      };
      if (draft.varietas) body.varietas = draft.varietas;
      if (item?.jenisKopi) body.jenisKopi = item.jenisKopi;
      if (catatanPemesanan.trim()) body.catatanPemesanan = catatanPemesanan.trim();

      const res = await createBooking(body);
      clearBookingDraft();
      saveLastInvoice(res);
      const idPembelian =
        res?.invoice?.idPembelian || res?.idPembelian || 'baru';
      navigate(`/invoice/${encodeURIComponent(idPembelian)}`, {
        state: { response: res },
      });
    } catch (err) {
      setError(
        err.message ||
          'Gagal membuat booking. Endpoint POST /api/booking mungkin belum siap di sistem admin.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wrap booking-wrap">
      <p className="kicker">Checkout</p>
      <h1>Pembelian</h1>

      <section className="section-block">
        <h2>Ringkasan pesanan</h2>
        <div className="info-grid compact">
          <div>
            <span>Petak</span>
            <strong>{draft.namaPolygon || displayName(item) || draft.idPolygon}</strong>
          </div>
          <div>
            <span>Proses</span>
            <strong>{draft.prosesPengolahan}</strong>
          </div>
          <div>
            <span>Jumlah</span>
            <strong>{formatKg(draft.jumlahPesananKg)}</strong>
          </div>
          <div>
            <span>Harga / kg</span>
            <strong>{formatRp(draft.hargaPerKg)}</strong>
          </div>
          <div>
            <span>Perkiraan total</span>
            <strong>{formatRp(draft.productPrice)}</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h2>Mekanisme pembayaran</h2>
        <p className="payment-box">{KETERANGAN_PEMBAYARAN}</p>
      </section>

      <form className="booking-form" onSubmit={onSubmit}>
        <h2>Data pembeli</h2>
        <label>
          Nama pembeli
          <input
            type="text"
            value={namaPembeli}
            onChange={(e) => setNamaPembeli(e.target.value)}
            required
          />
        </label>
        <label>
          Kontak (telepon / WA / email)
          <input
            type="text"
            value={kontakPembeli}
            onChange={(e) => setKontakPembeli(e.target.value)}
            required
          />
        </label>
        <label>
          Alamat
          <textarea
            rows={3}
            value={alamatPembeli}
            onChange={(e) => setAlamatPembeli(e.target.value)}
            required
          />
        </label>
        <label>
          Catatan (opsional)
          <textarea
            rows={2}
            value={catatanPemesanan}
            onChange={(e) => setCatatanPemesanan(e.target.value)}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Mengirim…' : 'Submit pesanan'}
          </button>
          <Link
            className="btn btn-ghost"
            to={`/lahan/${encodeURIComponent(idPolygon)}/booking`}
          >
            Kembali
          </Link>
        </div>
      </form>
    </div>
  );
}
