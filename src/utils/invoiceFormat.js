/** Token warna invoice PDF/cetak — selaras admin Argopuro Walida. */
export const INV = {
  brand: '#1C7344',
  brandRgb: [28, 115, 68],
  greenLight: '#E4F1E8',
  greenLightRgb: [228, 241, 232],
  tableHeader: '#E8F2EA',
  tableHeaderRgb: [232, 242, 234],
  greenDark: '#166534',
  greenDarkRgb: [22, 101, 52],
  footerBar: '#0E4E2C',
  footerBarRgb: [14, 78, 44],
  grayBox: '#F8F9FA',
  grayBoxRgb: [248, 249, 250],
  border: '#E5E5E5',
  borderRgb: [229, 229, 229],
  zebra: '#FAFAFA',
  zebraRgb: [250, 250, 250],
  label: '#262626',
  labelRgb: [38, 38, 38],
  body: '#0F0F0F',
  bodyRgb: [15, 15, 15],
  muted: '#2A2A2A',
  mutedRgb: [42, 42, 42],
  title: '#161616',
  titleRgb: [22, 22, 22],
  tableHeaderText: '#0C4828',
};

export function formatInvoiceDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) {
      // YYYY-MM-DD lokal
      const m = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const local = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return local.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      return String(dateString);
    }
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

export function formatIdNumber(value, fractionDigits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatIdRp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Rp 0';
  return `Rp ${n.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function paymentBadgeStyle(status) {
  const s = String(status || 'Belum Lunas').trim();
  if (s === 'Lunas') return { bg: '#198754', color: '#fff' };
  if (s === 'Belum Lunas') return { bg: '#FFC107', color: '#212529' };
  if (s === 'Pembayaran Bertahap') return { bg: '#0DCAF0', color: '#212529' };
  return { bg: '#6C757D', color: '#fff' };
}

export function orderBadgeStyle(status) {
  const s = String(status || 'Ordering').trim();
  if (s === 'Ordering') return { bg: '#FFC107', color: '#212529' };
  if (s === 'Complete') return { bg: '#198754', color: '#fff' };
  return { bg: '#6C757D', color: '#fff' };
}

export function normalizeBookingInvoice(invoice) {
  if (!invoice) return null;
  const pembeli = invoice.pembeli || {};
  const pesanan = invoice.pesanan || {};
  const berat = Number(pesanan.jumlahPesananKg) || 0;
  const harga = Number(pesanan.hargaPerKg) || 0;
  const subtotal = Math.round(berat * harga * 100) / 100;
  const totalHarga =
    pesanan.totalHarga != null && pesanan.totalHarga !== ''
      ? Number(pesanan.totalHarga)
      : subtotal;
  const petakParts = [pesanan.namaPolygon, pesanan.idPolygon]
    .filter((x) => x && String(x).trim())
    .join(' · ');

  return {
    idPembelian: invoice.idPembelian || '—',
    tanggalPemesanan: invoice.tanggalPemesanan || '',
    statusPembayaran: invoice.statusPembayaran || 'Belum Lunas',
    statusPemesanan: invoice.statusPemesanan || 'Ordering',
    keteranganPembayaran: invoice.keteranganPembayaran || '',
    pembeli: {
      namaPembeli: pembeli.namaPembeli || '—',
      kontakPembeli: pembeli.kontakPembeli || '—',
      alamatPembeli: pembeli.alamatPembeli || '—',
    },
    pesanan: {
      idPolygon: pesanan.idPolygon || '',
      namaPolygon: pesanan.namaPolygon || '',
      petakLabel: petakParts || pesanan.idPolygon || '—',
      prosesPengolahan: pesanan.prosesPengolahan || '—',
      jumlahPesananKg: berat,
      hargaPerKg: harga,
      subtotal,
      totalHarga: Number.isFinite(totalHarga) ? totalHarga : subtotal,
      tipeProduk: pesanan.tipeProduk || 'Green Beans',
      varietas: pesanan.varietas || '—',
      biayaPajak: Number(pesanan.biayaPajak) || 0,
      biayaPengiriman: Number(pesanan.biayaPengiriman) || 0,
      tipePajak: pesanan.tipePajak || 'penjumlahan',
    },
  };
}
