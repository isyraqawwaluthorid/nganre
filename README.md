# Nganre 🍲

🔗 **Demo: [nganre.vercel.app](https://nganre.vercel.app)** (daftar gratis dengan email + password)

**Nganre** (bahasa Makassar: makan) adalah peta interaktif untuk mencari tempat makan khas Makassar, mulai dari coto, konro, pallubasa, sop saudara, dan mie titi sampai warkop. Ada filter kategori, pencarian, dan fitur **"Dekat saya"** yang mengurutkan tempat berdasarkan jarak dari lokasimu.

Datanya berisi 223 tempat **asli** dari [OpenStreetMap](https://www.openstreetmap.org/), bukan data karangan. Jaringan franchise nasional sengaja tidak dimasukkan supaya yang tampil hanya usaha kuliner lokal.

## Fitur

- **Peta dengan cluster.** Pin otomatis dikelompokkan saat peta di-zoom out supaya tidak menumpuk.
- **Filter 9 kategori**, dengan jumlah tempat per kategori yang ikut berubah sesuai pencarian.
- **Pencarian** berdasarkan nama tempat, nama jalan, atau kecamatan.
- **Daftar dan peta tersinkron.** Hover di daftar membuat pin menyala, dan klik pin membuka detailnya.
- **Dekat saya** memakai Geolocation API. Kalau kamu sedang di luar Makassar atau izin lokasi ditolak, jarak dihitung dari Pantai Losari, jadi fiturnya tetap bisa dicoba dari mana saja.
- **Jam buka dan status live.** Contohnya "Buka · tutup 20.00" atau "Tutup · buka besok 08.30", dihitung dengan waktu WITA apa pun zona waktu pengunjung, lengkap dengan jadwal mingguan dan filter **Buka sekarang**. Setiap jam buka mencantumkan sumbernya.
- **🎲 Bingung makan apa?** Mengacak tempat makan (sesuai filter yang aktif) dengan animasi ala mesin slot. Selama mengacak, pin di peta ikut menyala bergantian.
- **Detail tempat** berisi alamat, jam buka, tombol rute ke Google Maps, dan 3 tempat sejenis terdekat.
- **Wajib login (email + password).** Pengunjung yang belum masuk diarahkan ke halaman `/masuk`, lalu dikembalikan ke halaman yang tadi dibuka (termasuk link `?tempat=...`).
- **❤️ Favorit.** Tempat favorit tersimpan di akun dan bisa difilter lewat chip "Favorit".
- **Link per tempat.** Tempat yang sedang dibuka tersimpan di URL (`?tempat=...`) dan bisa dibagikan lewat tombol Bagikan.
- **Responsif.** Di desktop tampil sidebar + peta. Di HP, peta tampil satu layar penuh dengan panel bawah yang bisa ditarik ke tiga posisi.
- **Detail kecil:** peta vektor bernuansa krem, tooltip nama saat pin di-hover, animasi pin dan kartu, tekan `/` untuk langsung mencari, dan `Esc` untuk menutup detail.

## Tech stack

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components) + TypeScript |
| Styling | Tailwind CSS 4 |
| Peta | Leaflet + react-leaflet, peta vektor MapLibre GL dari [OpenFreeMap](https://openfreemap.org) |
| Database & auth | Supabase (PostgreSQL + PostGIS, Auth, Row Level Security), opsional |
| Data | OpenStreetMap Overpass API + Nominatim |

## Menjalankan project

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Tanpa konfigurasi apa pun, aplikasi memakai data dari `data/places.json`.

## Cara kerja

1. `scripts/fetch-osm.mjs` mengambil semua restoran/kafe bernama di area Makassar dari Overpass API, lalu:
   - mengelompokkan ke kategori berdasarkan nama (misalnya "Pallu Basa Serigala" masuk *pallubasa*),
   - membuang jaringan franchise (tempat yang punya tag `brand` di OSM),
   - menggabungkan duplikat (nama sama dan jaraknya < 150 m),
   - melengkapi alamat lewat Nominatim reverse geocoding (1 request per detik, sesuai aturan pemakaian).
2. `src/lib/places.ts` membaca data dari Supabase kalau sudah dikonfigurasi, dan dari `data/places.json` kalau belum. Hasilnya di-cache 1 jam dengan `'use cache'`.
3. `src/components/Explorer.tsx` menyimpan semua state (pencarian, kategori, tempat terpilih, lokasi). Peta (`MapView.tsx`) di-load dengan `next/dynamic` + `ssr: false` karena Leaflet butuh `window`.

## Menghubungkan ke Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, lalu jalankan isi `supabase/schema.sql` (membuat tabel `places` dengan kolom geografi PostGIS dan index spasial).
3. Masih di SQL Editor, jalankan isi `supabase/seed.sql` (223 tempat).
4. Salin `.env.example` menjadi `.env.local`, lalu isi URL dan *publishable key* dari **Project Settings → API Keys**.
5. Restart `npm run dev`. Kalau berhasil, di bagian bawah daftar akan tertulis "via Supabase".

### Menambah jam buka

Sejauh ini baru 6 tempat yang punya data jam buka: 3 dari OpenStreetMap dan 3 dari artikel berita. Jam buka tidak pernah dikarang. Ada dua cara menambahnya:

1. **Lewat OpenStreetMap (disarankan).** Klik "Bantu lengkapi di OpenStreetMap" di halaman detail, isi tag `opening_hours`, lalu jalankan `npm run data:fetch`. Datanya ikut bermanfaat untuk semua pengguna OSM.
2. **Lewat `data/opening-hours.json`.** Ini untuk jam buka dari artikel atau sumber lain yang bisa dicek. Wajib cantumkan `source` dan `url`, dan pastikan alamat di sumber sama dengan lokasi di peta (bukan cabang lain).

Memperbarui data:

```bash
npm run data:fetch      # ambil ulang dari OpenStreetMap (alamat lama dipakai ulang, jadi cepat)
npm run data:seed-sql   # buat ulang supabase/seed.sql
```

## Login & favorit

Nganre **wajib login**. Pengecekannya dilakukan di server lewat `src/proxy.ts` (fitur *Proxy* Next.js 16, dulu disebut Middleware), sehingga halaman peta dan datanya tidak pernah dikirim ke pengunjung yang belum masuk. Login memakai **Supabase Auth** dengan email dan password.

Setelah login, user bisa menyimpan tempat favorit di tabel `favorites`. Tabel ini dilindungi **Row Level Security**, sehingga setiap user hanya bisa membaca, menambah, dan menghapus favoritnya sendiri.

Kalau Supabase belum dikonfigurasi (`.env.local` kosong), proxy tidak mengunci apa pun dan aplikasi tetap bisa dipakai tanpa login dengan data lokal.

### Setup di Supabase

1. Ikuti langkah "Menghubungkan ke Supabase" di atas: jalankan `schema.sql` dan `seed.sql`, lalu isi `.env.local`.
2. **Authentication → Sign In / Providers → Email:** pastikan aktif, matikan **Confirm email**, dan set panjang password minimal ke 8.
   > Konfirmasi email dimatikan karena layanan email bawaan Supabase hanya mengirim ke anggota tim project. Tanpa SMTP sendiri (misalnya Resend), email konfirmasi tidak akan sampai ke pengguna lain.
3. **Authentication → URL Configuration → Site URL:** isi alamat aplikasi (`http://localhost:3000`, atau domain setelah deploy).

### Cara kerja

1. Setiap request melewati `src/proxy.ts`, yang membaca sesi dari cookie dengan `getClaims()`. Token diverifikasi secara lokal memakai kunci publik ES256 project, tanpa query ke database.
   - Belum login → redirect ke `/masuk?next=<halaman yang dibuka>`.
   - Sudah login tapi membuka `/masuk` → dikembalikan ke peta.
   - Proxy sekaligus me-refresh cookie sesi yang hampir kedaluwarsa.
2. Halaman `/masuk` berisi form "Masuk" dan "Daftar" yang memanggil `signInWithPassword` atau `signUp` dari browser. Nama dari form daftar disimpan di `user_metadata.full_name`. Setelah berhasil, halaman dimuat ulang ke alamat `next`.
3. Halaman peta tetap dirender statis dan di-cache. Proxy berjalan sebelum halaman dikirim, jadi halaman statis pun ikut terlindungi.
4. Tombol ❤️ langsung mengubah tampilan (*optimistic update*). Kalau penyimpanan ke database gagal, tampilan dikembalikan seperti semula.

## Deploy

Nganre di-hosting di **Vercel** dengan server di Singapura (`sin1`, diatur di `vercel.json`), supaya dekat dengan Supabase (ap-southeast-1) dan pengguna di Indonesia.

```bash
npx vercel deploy --prod   # deploy ulang setelah ada perubahan
```

- Variabel `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` diisi di pengaturan environment Vercel (Production dan Preview), ditambah `CRON_SECRET` (Production, sensitive).
- `.vercelignore` mencegah file `.env*` (termasuk password database) ikut terunggah.
- *Site URL* di Supabase Auth diarahkan ke `https://nganre.vercel.app`.
- **Keep-alive harian.** Project Supabase gratis otomatis di-*pause* setelah 7 hari tanpa aktivitas, dan karena Nganre wajib login, seluruh situs akan ikut terkunci kalau itu terjadi. Untuk mencegahnya, Vercel Cron memanggil `/api/keep-alive` setiap hari pukul 01.00 UTC (09.00 WITA, diatur di `vercel.json`). Route itu mengirim query ringan ke tabel `places`.
  - Route dilindungi env `CRON_SECRET` (Vercel otomatis mengirim `Authorization: Bearer <CRON_SECRET>`) dan dikecualikan dari pengecekan login di `src/proxy.ts`.
  - Riwayat eksekusi bisa dilihat di dashboard Vercel → project → **Settings → Cron Jobs**.
  - Kalau project tetap ter-*pause*, aktifkan lagi lewat dashboard Supabase (*Restore*).

## Rencana pengembangan

- [x] Login dengan email + password (Supabase Auth)
- [ ] User bisa menambah tempat (klik di peta lalu isi form dan upload foto ke Supabase Storage)
- [ ] Rating & review
- [x] Simpan tempat favorit
- [ ] Lupa password (butuh SMTP sendiri untuk mengirim email)
- [ ] Login dengan Google
- [ ] Query "tempat dalam radius X km" dengan fungsi PostGIS `st_dwithin` di database
- [ ] Pengguna bisa mengusulkan jam buka langsung dari aplikasi
- [ ] Filter kategori dan pencarian juga tersimpan di URL

## Atribusi

Data tempat © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), dilisensikan di bawah ODbL 1.0. Peta dari [OpenFreeMap](https://openfreemap.org) © [OpenMapTiles](https://www.openmaptiles.org/). Ada data yang salah atau kurang? Perbaiki langsung di OpenStreetMap lewat tombol "OSM" di halaman detail.
