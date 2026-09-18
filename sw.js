// Service worker MINIMAL -- satu-satunya tujuannya supaya halaman yang
// dibuka lewat icon "Add to Home Screen" (mode standalone) SELALU ambil
// versi terbaru dari server begitu ada internet, bukan nyangkut di versi
// lama sampai icon-nya dihapus & dipasang ulang manual. Bug ini nyata --
// laporan Kang, 18 September 2026 (halaman Verifikasi Bayar via icon Home
// Screen masih nampilin versi lama walau server sudah update & sudah
// force-refresh di browser biasa).
//
// TIDAK menyimpan cache apa pun (bukan strategi cache-first/offline-first)
// -- untuk request navigasi (buka halaman), SELALU fetch ke server dengan
// {cache: "no-store"} supaya lewat total dari HTTP cache/CDN cache
// browser. Kalau network gagal (offline beneran), baru fallback ke apa
// pun yang browser masih punya di cache normal. skipWaiting()+clients.
// claim() supaya versi baru worker ini langsung aktif tanpa perlu tutup
// semua tab dulu.
self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (e) {
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).catch(function () {
        return caches.match(e.request);
      })
    );
  }
  // Request lain (CSS/JS/gambar dsb) dibiarkan jalan normal lewat browser,
  // tidak diutak-atik worker ini -- cuma HTML halaman yang perlu selalu
  // fresh.
});
