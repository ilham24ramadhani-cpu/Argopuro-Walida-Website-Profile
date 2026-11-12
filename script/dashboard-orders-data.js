/* Status & rekap pesanan customer (nilai status = persis dari admin, dipakai sebagai key i18n) */
(function (global) {
  const ORDER_STATUSES = ['Ordering', 'Complete', 'Dibatalkan'];
  const PAYMENT_STATUSES = ['Belum Lunas', 'Pembayaran Bertahap', 'Lunas'];

  function num(v) {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }

  function summarize(orders) {
    const byOrder = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
    const byPayment = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s, 0]));
    let totalKg = 0;
    let totalHarga = 0;
    (orders || []).forEach((o) => {
      totalKg += num(o.jumlahPesananKg);
      totalHarga += num(o.totalHarga);
      if (o.statusPemesanan) byOrder[o.statusPemesanan] = (byOrder[o.statusPemesanan] || 0) + 1;
      if (o.statusPembayaran) byPayment[o.statusPembayaran] = (byPayment[o.statusPembayaran] || 0) + 1;
    });
    return { count: (orders || []).length, totalKg, totalHarga, byOrder, byPayment };
  }

  /* Baris kloter pesanan; pesanan lama tanpa kloter[] = satu baris dari root */
  function kloterOf(o) {
    if (Array.isArray(o && o.kloter) && o.kloter.length) return o.kloter;
    return o ? [{ kloter: 1, prosesPengolahan: o.prosesPengolahan, jumlahPesananKg: o.jumlahPesananKg, hargaPerKg: o.hargaPerKg }] : [];
  }

  function processLabel(o) {
    return kloterOf(o)
      .map((k) => k.prosesPengolahan)
      .filter(Boolean)
      .join(', ');
  }

  function isMultiKloter(o) {
    return kloterOf(o).length > 1;
  }

  global.AWOrders = { ORDER_STATUSES, PAYMENT_STATUSES, summarize, num, kloterOf, processLabel, isMultiKloter };
})(window);
