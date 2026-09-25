import { invoiceLetterhead } from '../content/invoiceLetterhead';
import { KETERANGAN_PEMBAYARAN } from '../content/payment';
import {
  formatIdNumber,
  formatInvoiceDate,
  normalizeBookingInvoice,
  orderBadgeStyle,
  paymentBadgeStyle,
} from '../utils/invoiceFormat';

function StatusBadge({ label, style }) {
  return (
    <span
      className="inv-badge"
      style={{ background: style.bg, color: style.color }}
    >
      {label}
    </span>
  );
}

export default function InvoiceDocument({ invoice }) {
  const inv = normalizeBookingInvoice(invoice);
  if (!inv) return null;

  const p = inv.pesanan;
  const showExtras = p.biayaPajak > 0 || p.biayaPengiriman > 0;
  const pembayaran = inv.keteranganPembayaran?.trim() || KETERANGAN_PEMBAYARAN;

  return (
    <article className="inv-doc" id="invoice-print-area">
      <header className="inv-kop">
        <img className="inv-logo" src="/logo.png" alt="" />
        <div className="inv-kop-right">
          <strong className="inv-brand">{invoiceLetterhead.nama}</strong>
          <p>Kontak: {invoiceLetterhead.kontak}</p>
          <p>{invoiceLetterhead.alamat}</p>
        </div>
      </header>

      <hr className="inv-rule" />

      <h1 className="inv-title">{invoiceLetterhead.judul}</h1>
      <p className="inv-subtitle">{invoiceLetterhead.subjudul}</p>

      <section className="inv-ringkas">
        <h2>Ringkasan dokumen</h2>
        <div className="inv-ringkas-grid">
          <div>
            <span>ID Pembelian</span>
            <strong>{inv.idPembelian}</strong>
          </div>
          <div>
            <span>Status pesanan</span>
            <StatusBadge
              label={inv.statusPemesanan}
              style={orderBadgeStyle(inv.statusPemesanan)}
            />
          </div>
          <div>
            <span>Tanggal pemesanan</span>
            <strong>{formatInvoiceDate(inv.tanggalPemesanan)}</strong>
          </div>
          <div>
            <span>Status pembayaran</span>
            <StatusBadge
              label={inv.statusPembayaran}
              style={paymentBadgeStyle(inv.statusPembayaran)}
            />
          </div>
        </div>
      </section>

      <section className="inv-section">
        <h2>Data pembeli</h2>
        <dl className="inv-dl">
          <div>
            <dt>Nama</dt>
            <dd>{inv.pembeli.namaPembeli}</dd>
          </div>
          <div>
            <dt>Kontak</dt>
            <dd>{inv.pembeli.kontakPembeli}</dd>
          </div>
          <div>
            <dt>Alamat</dt>
            <dd>{inv.pembeli.alamatPembeli}</dd>
          </div>
        </dl>
      </section>

      <section className="inv-section">
        <h2>Data pesanan</h2>
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Varietas</th>
                <th>Proses pengolahan</th>
                <th>Petak</th>
                <th>Berat (kg)</th>
                <th>Harga / kg</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{p.tipeProduk}</td>
                <td>{p.varietas}</td>
                <td>{p.prosesPengolahan}</td>
                <td>{p.petakLabel}</td>
                <td className="num">{formatIdNumber(p.jumlahPesananKg, 2)}</td>
                <td className="num">{formatIdNumber(p.hargaPerKg, 0)}</td>
                <td className="num">{formatIdNumber(p.subtotal, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="inv-summary">
          {showExtras ? (
            <>
              <div>
                <span>PPh 22</span>
                <strong>{formatIdNumber(p.biayaPajak, 0)}</strong>
              </div>
              <div>
                <span>Pengiriman (Rp)</span>
                <strong>{formatIdNumber(p.biayaPengiriman, 0)}</strong>
              </div>
            </>
          ) : null}
          <div className="inv-total-band">
            <span>TOTAL TAGIHAN</span>
            <strong>{formatIdNumber(p.totalHarga, 0)}</strong>
          </div>
        </div>
      </section>

      <section className="inv-pay">
        <h2>Keterangan pembayaran</h2>
        <p>{pembayaran}</p>
      </section>

      <footer className="inv-foot">
        <p>{invoiceLetterhead.footer}</p>
        <p className="inv-print-date">
          Dicetak: {formatInvoiceDate(new Date().toISOString())}
        </p>
      </footer>
    </article>
  );
}
