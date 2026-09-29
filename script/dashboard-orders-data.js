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

  global.AWOrders = { ORDER_STATUSES, PAYMENT_STATUSES, summarize, num };
})(window);
