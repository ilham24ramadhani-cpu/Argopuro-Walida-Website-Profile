import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchBookingInvoice } from '../api/walida';
import { KETERANGAN_PEMBAYARAN } from '../content/payment';
import { formatKg, formatRp } from '../utils/format';
import { loadLastInvoice } from '../utils/bookingDraft';

function normalizeInvoice(payload) {
  if (!payload) return null;
  if (payload.invoice) return payload;
  if (payload.idPembelian || payload.pembeli || payload.pesanan) {
    return { invoice: payload };
  }
  return payload;
}

export default function Invoice() {
  const { idPembelian } = useParams();
  const location = useLocation();
  const [data, setData] = useState(() =>
    normalizeInvoice(location.state?.response || loadLastInvoice()),
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (data?.invoice) return undefined;
    let cancelled = false;
    fetchBookingInvoice(idPembelian)
      .then((res) => {
        if (!cancelled) setData(normalizeInvoice(res));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.message ||
              'Invoice tidak bisa dimuat. Endpoint GET /api/booking mungkin belum tersedia.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [idPembelian, data]);

  const invoice = data?.invoice;
  const pembeli = invoice?.pembeli || {};
  const pesanan = invoice?.pesanan || {};
  const pembayaran =
    invoice?.keteranganPembayaran || KETERANGAN_PEMBAYARAN;

  if (!invoice && error) {
    return (
      <div className="wrap">
        <h1>Invoice</h1>
        <p className="status-box error">{error}</p>
        <Link className="btn" to="/peta">
          Kembali ke peta
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="wrap">
        <p className="lede">Memuat invoice…</p>
      </div>
    );
  }

  return (
    <div className="wrap booking-wrap">
      <p className="kicker">Invoice</p>
      <h1>{invoice.idPembelian || idPembelian}</h1>
      <p className="lede">
        Tanggal: {invoice.tanggalPemesanan || '—'} · Status pembayaran:{' '}
        {invoice.statusPembayaran || 'Belum Lunas'}
      </p>

      <section className="section-block">
        <h2>Data pembeli</h2>
        <div className="info-grid compact">
          <div>
            <span>Nama</span>
            <strong>{pembeli.namaPembeli || '—'}</strong>
          </div>
          <div>
            <span>Kontak</span>
            <strong>{pembeli.kontakPembeli || '—'}</strong>
          </div>
          <div>
            <span>Alamat</span>
            <strong>{pembeli.alamatPembeli || '—'}</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h2>Data pemesanan</h2>
        <div className="info-grid compact">
          <div>
            <span>Petak</span>
            <strong>
              {pesanan.namaPolygon || pesanan.idPolygon || '—'}
              {pesanan.idPolygon ? ` (${pesanan.idPolygon})` : ''}
            </strong>
          </div>
          <div>
            <span>Produk</span>
            <strong>{pesanan.tipeProduk || 'Green Beans'}</strong>
          </div>
          <div>
            <span>Varietas</span>
            <strong>{pesanan.varietas || '—'}</strong>
          </div>
          <div>
            <span>Proses</span>
            <strong>{pesanan.prosesPengolahan || '—'}</strong>
          </div>
          <div>
            <span>Jumlah</span>
            <strong>{formatKg(pesanan.jumlahPesananKg)}</strong>
          </div>
          <div>
            <span>Harga / kg</span>
            <strong>{formatRp(pesanan.hargaPerKg)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatRp(pesanan.totalHarga)}</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <h2>Pembayaran</h2>
        <p className="payment-box">{pembayaran}</p>
      </section>

      <div className="actions">
        <Link className="btn" to="/peta">
          Kembali ke peta
        </Link>
        {pesanan.idPolygon ? (
          <Link
            className="btn btn-ghost"
            to={`/lahan/${encodeURIComponent(pesanan.idPolygon)}`}
          >
            Lihat petak
          </Link>
        ) : null}
      </div>
    </div>
  );
}
