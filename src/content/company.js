/**
 * Konten company profile — diedit di file ini, bukan dari database admin.
 *
 * Field kosong ('') tidak ditampilkan di halaman.
 * Jangan mengisi alamat, telepon, email, atau tahun berdiri jika datanya belum ada.
 *
 * Logo: public/logo.png (logo resmi Argopuro Walida).
 * Foto carousel: public/carousel/
 */
export const company = {
  nama: 'Argopuro Walida',
  bidang: 'Pengolahan kopi',
  tagline: 'Pengolahan kopi dari kebun mitra hingga green bean.',
  /** Kalimat singkat di hero beranda */
  pengantar:
    'Argopuro Walida mengolah kopi dari kebun mitra. Lihat lokasi kebun di peta polygon.',

  galeri: [
    {
      src: '/carousel/01-kebun.jpg',
      alt: 'Lanskap kebun kopi di lereng gunung',
    },
    {
      src: '/carousel/02-cherry.jpg',
      alt: 'Cherry kopi hasil panen',
    },
    {
      src: '/carousel/03-mitra.jpg',
      alt: 'Tim dan mitra Argopuro Walida',
    },
    {
      src: '/carousel/04-jemur.jpg',
      alt: 'Proses penjemuran kopi',
    },
    {
      src: '/carousel/05-pengeringan.jpg',
      alt: 'Rak pengeringan cherry kopi',
    },
  ],

  /**
   * [TEKS SEMENTARA — ganti isi array `tentang` di file ini]
   * Setiap string adalah satu paragraf.
   */
  tentang: [
    'Argopuro Walida bergerak di pengolahan kopi dan bekerja sama dengan petani kebun mitra.',
    'Lokasi kebun ditampilkan sebagai polygon di peta publik. Cerita perusahaan yang lebih lengkap dapat ditambahkan kemudian.',
  ],

  /**
   * [TEKS SEMENTARA — ganti langkah proses di file ini]
   * Alur untuk pengunjung, bukan layar produksi internal.
   */
  proses: {
    pengantar:
      'Ringkasan alur pengolahan kopi, dari panen cherry hingga green bean.',
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
    alamat: '',
    telepon: '',
    email: '',
    sosial: {
      instagram: '',
      facebook: '',
      youtube: '',
    },
  },
};
