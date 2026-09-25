/**
 * Teks company profile.
 * Field kosong ("" / null) = JANGAN ditampilkan di UI, JANGAN dikarang.
 * Isi alamat, telepon, email, dan sosial di objek kontak bila sudah siap.
 */
export const company = {
  nama: 'Argopuro Walida',
  bidang: 'Pengolahan kopi',
  tagline: 'Pengolahan kopi dari kebun mitra di lereng Argopuro.',
  galeri: [
    { file: '/carousel/01-kebun.jpg', alt: 'Lanskap kebun kopi di lereng gunung' },
    { file: '/carousel/02-cherry.jpg', alt: 'Cherry kopi hasil panen' },
    { file: '/carousel/03-mitra.jpg', alt: 'Tim dan mitra Argopuro Walida' },
    { file: '/carousel/04-jemur.jpg', alt: 'Proses penjemuran kopi' },
    { file: '/carousel/05-pengeringan.jpg', alt: 'Rak pengeringan cherry kopi' },
  ],
  // TODO: ganti dengan cerita perusahaan yang final
  tentang: [
    'Argopuro Walida bergerak di pengolahan kopi dan bekerja sama dengan petani kebun mitra.',
    'Lokasi kebun ditampilkan sebagai polygon di peta publik. Cerita perusahaan yang lebih lengkap dapat ditambahkan kemudian.',
  ],
  proses: {
    // TODO: sesuaikan narasi proses untuk pengunjung
    pengantar: 'Ringkasan alur pengolahan kopi, dari panen cherry hingga green bean.',
    langkah: [
      {
        judul: 'Panen cherry',
        teks: 'Buah kopi dipetik di kebun mitra, lalu dicatat berat cherry-nya per polygon kebun.',
      },
      {
        judul: 'Sortasi',
        teks: 'Cherry dipilah agar buah yang masuk ke pengolahan lebih seragam.',
      },
      {
        judul: 'Pengolahan',
        teks: 'Cherry diolah sesuai metode yang dipakai (misalnya washed, honey, atau natural).',
      },
      {
        judul: 'Pengeringan',
        teks: 'Kopi dikeringkan hingga kadar air aman untuk disimpan dan dihull.',
      },
      {
        judul: 'Green bean',
        teks: 'Kulit tanduk dilepas menjadi green bean. Potential GB di peta mengikuti data yang sudah dihitung.',
      },
      {
        judul: 'Grading dan kemas',
        teks: 'Biji disortir, dinilai, lalu dikemas untuk mitra atau pembeli.',
      },
    ],
  },
  kontak: {
    nama: 'Argopuro Walida',
    // TODO: isi data kontak — field kosong tidak ditampilkan
    alamat: '',
    telepon: '',
    email: '',
    sosial: {
      // TODO: isi URL sosial jika ada
      instagram: '',
      facebook: '',
      youtube: '',
    },
  },
};
