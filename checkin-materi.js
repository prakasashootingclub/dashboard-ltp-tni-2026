// checkin-materi.js
//
// Logika bersama untuk 6 halaman "Daftar Ulang <Materi>" (Senapan,
// Eksekutif, Falling Plate, IPSC, Non IPSC, Air Rifle) -- nama tampilan
// diganti dari "Check In Materi" ke "Daftar Ulang" (permintaan Kang, 7
// September 2026, bersamaan dengan dihapusnya pos Verifikasi Pusat dari
// alur). Nama variabel/field INTERNAL (checkinMateri, waktuCheckin, dst)
// SENGAJA tetap tidak diubah -- itu cuma nama teknis di kode & field JSON
// dari backend, tidak pernah tampil ke pengguna. Tiap halaman HTML tinggal
// set `const MATERI_KEY = "senapan";` (dst) SEBELUM memuat file ini.
//
// Baris peserta HANYA muncul di sini kalau QR e-tiketnya SUDAH discan di
// pos Daftar Ulang (checkinMateri === "Sudah") -- beda dengan data-
// peserta.html yang menampilkan SEMUA peserta terdaftar. Halaman ini
// dipakai operator penentu gelombang & lajur di venue, jadi yang relevan
// cuma siapa yang SUDAH datang dan daftar ulang, bukan siapa yang baru
// terdaftar online. Permintaan Kang, 5 September 2026.
//
// Diurutkan ASCENDING berdasarkan Waktu Daftar Ulang (siapa yang daftar
// ulang duluan tampil duluan) supaya operator gampang bagi gelombang/lajur
// berurutan sesuai kedatangan.

const FALLING_PLATE_ITEMS = [
  "Falling Plate Optic", "Falling Plate Non Optic",
  "Falling Plate Optic (TNI/Polri)", "Falling Plate Non Optic (TNI/Polri)",
];
const NON_IPSC_ITEMS = ["Non IPSC Standard Putra", "Non IPSC Standard Putri"];

// Sama persis dengan kategoriList/itemCatalog di data-peserta.html &
// index.html -- SATU sumber di sini supaya tidak ada 6 salinan logika
// pencocokan yang bisa saling beda kalau salah satu diubah belakangan.
const MATERI_REGISTRY = {
  senapan: {
    judul: "Senapan",
    match: r => r.kategori === "Senapan",
    katalog: [
      "100 M Plat Baja 3 Sikap Perorangan (Open)",
      "100 M Plat Baja 3 Sikap Beregu (Open)",
      "100 M Plat Baja 3 Sikap Perorangan (Standard/Pejera Logam)",
      "100 M Plat Baja 3 Sikap Beregu (Standard/Pejera Logam)",
      "300 M Plat Baja 3 Sikap Perorangan (Open)",
      "300 M Plat Baja 3 Sikap Beregu (Open)",
      "300 M Plat Baja 3 Sikap Perorangan (Standard/Pejera Logam)",
      "300 M Plat Baja 3 Sikap Beregu (Standard/Pejera Logam)",
      "600 M Tactical Prone Perorangan (TNI/Polri)",
      "600 M Tactical Prone Perorangan (Sipil)",
    ],
  },
  eksekutif: {
    judul: "Eksekutif",
    match: r => r.kategori === "Pistol" && !FALLING_PLATE_ITEMS.includes(r.item),
    katalog: [
      "20 M Eksekutif Perorangan",
      "20 M Eksekutif Beregu",
      "20 M Eksekutif Perorangan (TNI/Polri)",
      "20 M Eksekutif Beregu (TNI/Polri)",
    ],
  },
  fallingplate: {
    judul: "Falling Plate",
    match: r => r.kategori === "Pistol" && FALLING_PLATE_ITEMS.includes(r.item),
    katalog: FALLING_PLATE_ITEMS,
  },
  ipsc: {
    judul: "IPSC Level II",
    match: r => r.kategori === "Tembak Reaksi IPSC Level II" && !NON_IPSC_ITEMS.includes(r.item),
    katalog: [
      "Divisi Open", "Divisi Standard", "Divisi Optic",
      "Divisi Production", "Divisi Production Optic", "Divisi PCC Optic",
    ],
    showIpscExtra: true,
  },
  nonipsc: {
    judul: "Non IPSC",
    match: r => r.kategori === "Tembak Reaksi IPSC Level II" && NON_IPSC_ITEMS.includes(r.item),
    katalog: NON_IPSC_ITEMS,
  },
  airrifle: {
    judul: "Air Rifle",
    match: r => r.kategori === "Air Rifle",
    katalog: [
      "WRABF HR 25 M (Junior)", "WRABF HR 25 M (Senior)",
      "WRABF LR 25 M (Junior)", "WRABF LR 25 M (Senior)",
      "IMSSU Multirange 18-41 M (Junior)", "IMSSU Multirange 18-41 M (Senior)",
    ],
  },
};

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyGY8Pi3gBALM8GVP6XCB04P_eebPw2thlP_ShQR6IVC31vuCZcWXxQK677crIgHysu/exec";

// Password DIPISAH PER KELOMPOK materi (permintaan Kang, 13 September
// 2026) -- sebelumnya halaman ini sama sekali tanpa password. Eksekutif &
// Falling Plate berbagi 1 password (sama-sama Pistol, 1 meja pos), begitu
// juga IPSC & Non IPSC. Pemetaan ini HARUS sama persis dengan
// DAFTAR_ULANG_KELOMPOK_ di Code.js.
const MATERI_GROUP = {
  senapan: "senapan", eksekutif: "eksfp", fallingplate: "eksfp",
  airrifle: "airrifle", ipsc: "ipscnon", nonipsc: "ipscnon"
};
const GROUP = MATERI_GROUP[MATERI_KEY];
const STORAGE_KEY = "daftarUlangPw_" + GROUP;
const GROUP_LABEL = {
  senapan: "Senapan", eksfp: "Eksekutif & Falling Plate",
  airrifle: "Air Rifle", ipscnon: "IPSC & Non IPSC"
};

const materi = MATERI_REGISTRY[MATERI_KEY];
let allRows = [];

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function waLink(hp) {
  const digits = String(hp || "").replace(/[^0-9]/g, "");
  return digits ? `<a href="https://wa.me/${digits}" target="_blank" rel="noopener">${escapeHtml(hp)}</a>` : "-";
}

function checkinRows() {
  return allRows.filter(r => materi.match(r) && r.checkinMateri === "Sudah");
}

function filteredRows() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const rows = checkinRows();
  // Kupon "-" (belum diisi) sengaja tidak pernah dianggap cocok, apa pun
  // yang diketik. Permintaan Kang, 14 September 2026 (cari pemilik
  // nomor kupon pemenang undian doorprize langsung dari daftar yang
  // sudah datang).
  return q
    ? rows.filter(r => (r.nama || "").toLowerCase().includes(q) ||
        (r.hp || "").toLowerCase().includes(q) ||
        (r.nomorKupon && r.nomorKupon !== "-" && r.nomorKupon.toLowerCase().includes(q)))
    : rows;
}

// Header tabel (No./Nama/No HP/Golongan/Instansi/Club/Kupon Doorprize/
// Waktu Daftar Ulang, + 3 kolom IPSC kalau relevan) SEKARANG SELALU
// tampil, walau belum ada 1 pun peserta yang daftar ulang di sub-materi
// itu -- sebelumnya <thead> cuma dirender kalau rows.length > 0, jadi
// yang kosong cuma nampilin baris "Belum ada peserta..." tanpa judul
// kolom sama sekali. Permintaan Kang, 16 September 2026.
function tabelSubMateriHtml(rows) {
  const kolomExtra = materi.showIpscExtra
    ? `<th>Power Factor</th><th>Kategori</th><th>Waktu Pelaksanaan</th>`
    : "";
  const jumlahKolom = 7 + (materi.showIpscExtra ? 3 : 0);
  // Urut ASCENDING waktu daftar ulang (siapa datang duluan tampil duluan).
  const sorted = rows.slice().sort((a, b) => (a.waktuCheckinRaw || "").localeCompare(b.waktuCheckinRaw || ""));
  const isiTbody = rows.length
    ? sorted.map((r, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="nama">${escapeHtml(r.nama)}</td>
          <td class="hp">${waLink(r.hp)}</td>
          <td>${escapeHtml(r.golongan)}</td>
          <td>${escapeHtml(r.instansiClub)}</td>
          <td>${escapeHtml(r.nomorKupon && r.nomorKupon !== "-" ? r.nomorKupon : "-")}</td>
          <td class="waktu-cell">${escapeHtml(r.waktuCheckin)}</td>
          ${materi.showIpscExtra ? `
          <td>${escapeHtml(r.powerFactor)}</td>
          <td>${escapeHtml(r.kategoriIpsc)}</td>
          <td>${escapeHtml(r.waktuPelaksanaan)}</td>
          ` : ""}
        </tr>
      `).join("")
    : `<tr class="empty-row"><td colspan="${jumlahKolom}">Belum ada peserta daftar ulang di sub-materi ini.</td></tr>`;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="num">No.</th>
            <th>Nama</th>
            <th>No HP</th>
            <th>Golongan</th>
            <th>Instansi/Club</th>
            <th>Kupon Doorprize</th>
            <th>Waktu Daftar Ulang</th>
            ${kolomExtra}
          </tr>
        </thead>
        <tbody>
          ${isiTbody}
        </tbody>
      </table>
    </div>
  `;
}

function tabelHtml(rows) {
  const grupItem = {};
  rows.forEach(r => {
    const it = r.item || "Lainnya";
    if (!grupItem[it]) grupItem[it] = [];
    grupItem[it].push(r);
  });

  const daftarItem = materi.katalog.concat(
    Object.keys(grupItem).filter(it => !materi.katalog.includes(it))
  );

  return daftarItem.map(item => {
    const irows = grupItem[item] || [];
    return `
    <div class="sub-materi">
      <div class="sub-head">
        <h3>${escapeHtml(item)}</h3>
        <span class="kat-count">${irows.length} sudah daftar ulang</span>
      </div>
      ${tabelSubMateriHtml(irows)}
    </div>
  `;
  }).join("");
}

function downloadXlsx() {
  if (typeof XLSX === "undefined") { alert("Library Excel belum selesai dimuat, coba lagi sebentar lagi."); return; }
  const rows = filteredRows().slice().sort((a, b) => (a.waktuCheckinRaw || "").localeCompare(b.waktuCheckinRaw || ""));
  const kolom = [
    ["no", "No."], ["nama", "Nama"], ["hp", "No HP"], ["item", "Item"], ["golongan", "Golongan"],
    ["instansiClub", "Instansi/Club"], ["nomorKupon", "Kupon Doorprize"],
    ["waktuCheckin", "Waktu Daftar Ulang"],
    ["powerFactor", "Power Factor (IPSC)"], ["kategoriIpsc", "Kategori (IPSC)"], ["waktuPelaksanaan", "Waktu Pelaksanaan (IPSC)"]
  ];
  const aoa = [kolom.map(k => k[1])];
  rows.forEach((r, i) => { aoa.push(kolom.map(k => k[0] === "no" ? i + 1 : (r[k[0]] == null ? "" : r[k[0]]))); });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = kolom.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daftar Ulang " + materi.judul);
  const tanggal = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, "checkin-" + MATERI_KEY + "-ltp-tni-2026-" + tanggal + ".xlsx");
}

function render() {
  const rows = filteredRows();
  document.getElementById("countBadge").textContent = rows.length + " sudah daftar ulang";
  document.getElementById("katSections").innerHTML = tabelHtml(rows);
}

// Mengembalikan true kalau password diterima server (dipakai gerbang untuk
// tahu harus buka kunci atau tidak), false kalau ditolak. Tetap dipakai
// utuk polling data tiap 15 detik setelah terbuka.
async function muatData(pw) {
  try {
    const res = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "list_daftar_ulang", materiKey: MATERI_KEY, pw: pw })
    });
    const json = await res.json();
    if (!json.ok) {
      if (document.getElementById("gate").classList.contains("hidden")) {
        // Sesi sudah terbuka tapi request berikutnya gagal (mis. password
        // diganti admin di tengah jalan) -- kunci ulang, jangan biarkan
        // diam nyangkut kosong.
        sessionStorage.removeItem(STORAGE_KEY);
        document.getElementById("app").classList.add("hidden");
        document.getElementById("gate").classList.remove("hidden");
        document.getElementById("pwErr").textContent = (json.pesan || "Password salah.") + " Silakan masukkan password lagi.";
      }
      return false;
    }
    allRows = json.rows || [];
    render();
    const now = new Date();
    document.getElementById("lastSync").textContent = "Terakhir diperbarui: " + now.toLocaleTimeString("id-ID", { hour12: false });
    return true;
  } catch (err) {
    document.getElementById("katSections").innerHTML =
      `<div class="table-wrap"><table><tbody><tr class="empty-row"><td>Gagal terhubung ke server: ${escapeHtml(err.message || err)}</td></tr></tbody></table></div>`;
    return true; // jaringan bermasalah, bukan soal password -- jangan kunci ulang
  }
}

document.title = "LTP TNI 2026 — Daftar Ulang " + materi.judul;
document.getElementById("pageTitle").textContent = "Daftar Ulang — " + materi.judul;
document.getElementById("gateTitle").textContent = "Daftar Ulang — " + materi.judul;
document.getElementById("gateSub").textContent = "Password pos " + GROUP_LABEL[GROUP];
document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("downloadBtn").addEventListener("click", downloadXlsx);

let pollInterval = null;
function bukaHalaman(pw) {
  document.getElementById("gate").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  sessionStorage.setItem(STORAGE_KEY, pw);
  muatData(pw);
  if (!pollInterval) pollInterval = setInterval(() => muatData(sessionStorage.getItem(STORAGE_KEY)), 15000);
}

document.getElementById("pwBtn").onclick = async function(){
  const pw = document.getElementById("pwInput").value.trim();
  const err = document.getElementById("pwErr");
  if (!pw) { err.textContent = "Isi password dulu."; return; }
  err.textContent = "";
  const btn = document.getElementById("pwBtn");
  btn.disabled = true; btn.textContent = "Memeriksa...";
  const ok = await muatData(pw);
  btn.disabled = false; btn.textContent = "Masuk";
  if (ok) {
    bukaHalaman(pw);
  } else {
    err.textContent = "Password salah.";
  }
};
document.getElementById("pwInput").addEventListener("keydown", function(e){
  if (e.key === "Enter") document.getElementById("pwBtn").click();
});

const savedPw = sessionStorage.getItem(STORAGE_KEY);
if (savedPw) {
  muatData(savedPw).then(ok => {
    if (ok) bukaHalaman(savedPw);
    else { sessionStorage.removeItem(STORAGE_KEY); document.getElementById("pwErr").textContent = "Sesi berakhir, masukkan password lagi."; }
  });
}
