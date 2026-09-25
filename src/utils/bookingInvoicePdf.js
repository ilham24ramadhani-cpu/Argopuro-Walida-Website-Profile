import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { invoiceLetterhead } from '../content/invoiceLetterhead';
import { KETERANGAN_PEMBAYARAN } from '../content/payment';
import {
  INV,
  formatIdNumber,
  formatInvoiceDate,
  normalizeBookingInvoice,
  orderBadgeStyle,
  paymentBadgeStyle,
} from './invoiceFormat';

async function fetchLogoDataUrl() {
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function drawBadge(doc, x, y, text, style) {
  const label = String(text || '—');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const padX = 2.2;
  const h = 5.8;
  const w = doc.getTextWidth(label) + padX * 2;
  const [br, bg, bb] = hexToRgb(style.bg);
  const [tr, tg, tb] = hexToRgb(style.color);
  doc.setFillColor(br, bg, bb);
  doc.roundedRect(x, y - h / 2, w, h, 1, 1, 'F');
  doc.setTextColor(tr, tg, tb);
  doc.text(label, x + padX, y + 1.1);
  doc.setTextColor(...INV.bodyRgb);
  return w;
}

/**
 * Generate PDF invoice booking A4 portrait.
 * @returns {Promise<{ blob: Blob, fileName: string }>}
 */
export async function generateBookingInvoicePdf(invoiceRaw) {
  const inv = normalizeBookingInvoice(invoiceRaw);
  if (!inv) throw new Error('Data invoice tidak tersedia.');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  const rx = pageW - marginR;
  const cx = pageW / 2;
  let y = 12;

  const logo = await fetchLogoDataUrl();
  const logoW = 22;
  const logoH = 22;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', marginL, y, logoW, logoH);
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(...INV.brandRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(invoiceLetterhead.nama, rx, y + 6, { align: 'right' });

  doc.setTextColor(...INV.mutedRgb);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kontak: ${invoiceLetterhead.kontak}`, rx, y + 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const addrLines = doc.splitTextToSize(invoiceLetterhead.alamat, 95);
  let ay = y + 15.5;
  addrLines.forEach((ln) => {
    doc.text(ln, rx, ay, { align: 'right' });
    ay += 3.8;
  });

  const yRule = Math.max(logo ? y + logoH : y, ay) + 3;
  doc.setDrawColor(...INV.borderRgb);
  doc.setLineWidth(0.2);
  doc.line(marginL, yRule, rx, yRule);

  y = yRule + 7;
  doc.setTextColor(...INV.titleRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(invoiceLetterhead.judul, cx, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(48, 48, 48);
  doc.text(invoiceLetterhead.subjudul, cx, y, { align: 'center' });
  y += 10;

  // Ringkasan dokumen
  const boxH = 28;
  doc.setFillColor(...INV.grayBoxRgb);
  doc.setDrawColor(...INV.borderRgb);
  doc.setLineWidth(0.15);
  doc.roundedRect(marginL, y, contentW, boxH, 1.2, 1.2, 'FD');
  doc.setFillColor(240, 242, 244);
  doc.rect(marginL + 0.2, y + 0.2, contentW - 0.4, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 24);
  doc.text('Ringkasan dokumen', marginL + 4, y + 5);
  doc.setDrawColor(...INV.borderRgb);
  doc.line(marginL, y + 7.2, marginL + contentW, y + 7.2);

  const col1 = marginL + 4;
  const col2 = marginL + contentW / 2 + 4;
  const row1 = y + 14;
  const row2 = y + 22;
  doc.setFontSize(8.5);
  doc.setTextColor(...INV.labelRgb);
  doc.text('ID Pembelian', col1, row1);
  doc.text('Tanggal pemesanan', col1, row2);
  doc.text('Status pesanan', col2, row1);
  doc.text('Status pembayaran', col2, row2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INV.bodyRgb);
  doc.text(String(inv.idPembelian), col1 + 38, row1);
  doc.text(formatInvoiceDate(inv.tanggalPemesanan), col1 + 38, row2);
  drawBadge(doc, col2 + 38, row1 - 0.5, inv.statusPemesanan, orderBadgeStyle(inv.statusPemesanan));
  drawBadge(
    doc,
    col2 + 38,
    row2 - 0.5,
    inv.statusPembayaran,
    paymentBadgeStyle(inv.statusPembayaran),
  );
  y += boxH + 8;

  // Data pembeli
  doc.setFillColor(...INV.greenLightRgb);
  doc.setDrawColor(...INV.borderRgb);
  doc.rect(marginL, y, contentW, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INV.brandRgb);
  doc.text('Data pembeli', marginL + 4, y + 4.8);
  y += 10;

  const buyerRows = [
    ['Nama', inv.pembeli.namaPembeli],
    ['Kontak', inv.pembeli.kontakPembeli],
    ['Alamat', inv.pembeli.alamatPembeli],
  ];
  buyerRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INV.labelRgb);
    doc.text(label, marginL + 2, y);
    doc.setTextColor(...INV.bodyRgb);
    const lines = doc.splitTextToSize(String(value || '—'), contentW - 42);
    lines.forEach((ln, i) => doc.text(ln, marginL + 36, y + i * 4.2));
    y += Math.max(lines.length, 1) * 4.2 + 3;
  });
  y += 4;

  // Data pesanan — tabel
  doc.setFillColor(...INV.greenLightRgb);
  doc.setDrawColor(...INV.borderRgb);
  doc.rect(marginL, y, contentW, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INV.brandRgb);
  doc.text('Data pesanan', marginL + 4, y + 4.8);
  y += 9;

  const p = inv.pesanan;
  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [
      [
        'Produk',
        'Varietas',
        'Proses pengolahan',
        'Petak',
        'Berat (kg)',
        'Harga / kg',
        'Subtotal',
      ],
    ],
    body: [
      [
        p.tipeProduk,
        p.varietas,
        p.prosesPengolahan,
        p.petakLabel,
        formatIdNumber(p.jumlahPesananKg, 2),
        formatIdNumber(p.hargaPerKg, 0),
        formatIdNumber(p.subtotal, 0),
      ],
    ],
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: INV.bodyRgb,
      lineColor: INV.borderRgb,
      lineWidth: 0.12,
      cellPadding: 2.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: INV.tableHeaderRgb,
      textColor: [12, 72, 40],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: INV.zebraRgb },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 6;

  // Ringkasan kanan + TOTAL TAGIHAN
  const summaryW = 78;
  const summaryX = rx - summaryW;
  const showExtras = p.biayaPajak > 0 || p.biayaPengiriman > 0;
  let sy = y;

  if (showExtras) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...INV.labelRgb);
    doc.text('PPh 22', summaryX, sy);
    doc.setTextColor(...INV.bodyRgb);
    doc.text(formatIdNumber(p.biayaPajak, 0), rx, sy, { align: 'right' });
    sy += 5;
    doc.setTextColor(...INV.labelRgb);
    doc.text('Pengiriman (Rp)', summaryX, sy);
    doc.setTextColor(...INV.bodyRgb);
    doc.text(formatIdNumber(p.biayaPengiriman, 0), rx, sy, { align: 'right' });
    sy += 6;
  }

  const bandH = 9;
  doc.setFillColor(...INV.greenDarkRgb);
  doc.rect(summaryX, sy, summaryW, bandH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL TAGIHAN', summaryX + 3, sy + 5.8);
  doc.setFont('courier', 'bold');
  doc.text(formatIdNumber(p.totalHarga, 0), rx - 3, sy + 5.8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  y = Math.max(y, sy + bandH) + 10;

  // Keterangan pembayaran
  const payText =
    inv.keteranganPembayaran?.trim() || KETERANGAN_PEMBAYARAN;
  const payLines = doc.splitTextToSize(payText, contentW - 8);
  const payH = 8 + payLines.length * 4.2 + 4;
  doc.setFillColor(...INV.greenLightRgb);
  doc.setDrawColor(...INV.borderRgb);
  doc.roundedRect(marginL, y, contentW, payH, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INV.brandRgb);
  doc.text('Keterangan pembayaran', marginL + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INV.bodyRgb);
  let py = y + 11;
  payLines.forEach((ln) => {
    doc.text(ln, marginL + 4, py);
    py += 4.2;
  });
  y += payH + 12;

  // Footer strip
  const footY = Math.max(y, 275);
  doc.setFillColor(...INV.footerBarRgb);
  doc.rect(0, footY, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(invoiceLetterhead.footer, cx, footY + 5.5, { align: 'center' });
  doc.setFontSize(7);
  doc.text(
    `Dicetak: ${formatInvoiceDate(new Date().toISOString())}`,
    cx,
    footY + 10,
    { align: 'center' },
  );

  const fileName = `invoice-pemesanan-${inv.idPembelian}.pdf`;
  const blob = doc.output('blob');
  return { blob, fileName, doc };
}

export async function downloadBookingInvoicePdf(invoiceRaw) {
  const { blob, fileName } = await generateBookingInvoicePdf(invoiceRaw);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return fileName;
}
