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
// Aksi READ-ONLY (cari/list/lihat, tidak pernah mengubah data) -- SATU-
// SATUNYA yang boleh di-retry otomatis kalau gagal. Aksi yang mengubah
// data (tandai_lunas, hapus_*, upload_*, update_peserta_data, dst) SENGAJA
// TIDAK di-retry otomatis -- kalau request pertama sebenarnya sudah
// sampai & diproses server tapi jawabannya yang gagal balik (bukan
// requestnya yang gagal), retry otomatis bisa bikin aksi itu KEDOBEL
// (mis. 2x "Tandai Lunas" terkirim). Untuk aksi ini petugas tetap harus
// klik ulang manual, sengaja begitu.
var AKSI_AMAN_DIRETRY_ = /^(cari_|list_|get_|dump_|cek_|ambil_|ringkasan_)/;
function bolehRetry_(options) {
  try {
    var body = JSON.parse((options && options.body) || "{}");
    return AKSI_AMAN_DIRETRY_.test(String(body.action || ""));
  } catch (e) {
    return false;
  }
}

function fetchTimeout(url, options, ms) {
  // 20000 -> 45000 -- server Apps Script terukur konsisten butuh ~33-35
  // detik untuk merespons saat trafik OTS lagi padat (banyak submit form
  // bersamaan bikin antrean eksekusi). Timeout 20 detik yang lama SELALU
  // membatalkan request itu sebelum server sempat menjawab, muncul sebagai
  // "gagal connect" padahal server sebenarnya masih hidup & tetap
  // memproses. Ditemukan Kang, 18 September 2026 (laporan "verifikasi
  // bayar gagal connect" pas puncak OTS).
  ms = ms || 45000;

  function sekaliCoba() {
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

  // Retry otomatis 1x KHUSUS aksi read-only -- sinyal di lokasi lomba
  // sering putus-nyambung sesaat (bukan cuma pas trafik padat, ditemukan
  // Kang 18 September 2026: keluhan "gagal terhubung" di kolom pencarian
  // muncul acak, tidak terkait jam sibuk). Retry pertama ditunda 800ms
  // supaya tidak langsung nembak ulang ke koneksi yang masih goyang.
  if (bolehRetry_(options)) {
    return sekaliCoba().catch(function (err) {
      return new Promise(function (resolve) { setTimeout(resolve, 800); })
        .then(function () { return sekaliCoba(); })
        .catch(function () { throw err; }); // gagal lagi -- lempar error PERTAMA (lebih jelas dari error timeout retry ke-2)
    });
  }
  return sekaliCoba();
}
