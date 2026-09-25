import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchBookingInvoice } from '../api/walida';
import InvoiceDocument from '../components/InvoiceDocument';
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
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState('');

  useEffect(() => {
    const fromState = normalizeInvoice(location.state?.response);
    if (fromState?.invoice) {
      const id = fromState.invoice.idPembelian;
      if (!id || id === idPembelian) {
        setData(fromState);
        return undefined;
      }
    }

    const cached = normalizeInvoice(loadLastInvoice());
    if (cached?.invoice?.idPembelian === idPembelian) {
      setData(cached);
      return undefined;
    }

    let cancelled = false;
    fetchBookingInvoice(idPembelian)
      .then((res) => {
        if (!cancelled) setData(normalizeInvoice(res));
      })
      .catch((err) => {
        if (!cancelled) {
          if (cached?.invoice) {
            setData(cached);
          } else {
            setError(
              err.message ||
                'Invoice tidak bisa dimuat. Endpoint GET /api/booking mungkin belum tersedia.',
            );
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [idPembelian, location.state]);

  const invoice = data?.invoice;
  const pesanan = invoice?.pesanan || {};

  const onDownloadPdf = async () => {
    if (!invoice) return;
    setPdfBusy(true);
    setPdfMsg('');
    try {
      const { downloadBookingInvoicePdf } = await import(
        '../utils/bookingInvoicePdf'
      );
      const name = await downloadBookingInvoicePdf(invoice);
      setPdfMsg(`PDF diunduh: ${name}`);
    } catch (err) {
      setPdfMsg(err.message || 'Gagal membuat PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  const onPrintPage = () => {
    window.print();
  };

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
    <div className="wrap invoice-page">
      <div className="invoice-toolbar no-print">
        <div>
          <p className="kicker">Invoice booking</p>
          <h1 className="invoice-page-title">{invoice.idPembelian || idPembelian}</h1>
        </div>
        <div className="invoice-actions">
          <button
            type="button"
            className="btn btn-invoice"
            onClick={onDownloadPdf}
            disabled={pdfBusy}
          >
            {pdfBusy ? 'Menyiapkan PDF…' : 'Unduh PDF'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onPrintPage}>
            Cetak halaman
          </button>
          <Link className="btn btn-ghost" to="/peta">
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
        {pdfMsg ? <p className="form-hint">{pdfMsg}</p> : null}
      </div>

      <InvoiceDocument invoice={invoice} />
    </div>
  );
}
