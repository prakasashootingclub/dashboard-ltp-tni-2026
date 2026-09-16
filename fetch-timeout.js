// fetch-timeout.js
//
// Pengganti drop-in untuk fetch(WEBAPP_URL, opts) di semua halaman dashboard
// -- sebelumnya kalau sinyal di lokasi lomba jelek, request yang menggantung
// (bukan gagal total, cuma lambat/setengah jalan) bikin tombol tetap
// "Memproses..." TANPA BATAS WAKTU, petugas tidak tahu harus nunggu berapa
// lama atau refresh. fetchTimeout() otomatis batalkan request setelah N
// detik dan lempar error yang jelas ("sinyal mungkin jelek, coba lagi"),
// yang otomatis tertangkap .catch() yang SUDAH ADA di tiap halaman (tombol
// otomatis kembali aktif, pesan error muncul) -- TIDAK perlu ubah logika
// lain di tiap halaman, cukup ganti fetch(WEBAPP_URL, ...) jadi
// fetchTimeout(WEBAPP_URL, ..., <ms opsional>). Permintaan Kang, 16
// September 2026 (keluhan sinyal jelek di lokasi lomba).
function fetchTimeout(url, options, ms) {
  ms = ms || 20000;
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, ms);
  var opts = Object.assign({}, options, { signal: controller.signal });
  return fetch(url, opts).then(
    function (res) { clearTimeout(timer); return res; },
    function (err) {
      clearTimeout(timer);
      if (err && err.name === "AbortError") {
        throw new Error("Koneksi ke server lambat/menggantung lebih dari " + Math.round(ms / 1000) + " detik -- sinyal mungkin jelek, coba lagi.");
      }
      throw err;
    }
  );
}
