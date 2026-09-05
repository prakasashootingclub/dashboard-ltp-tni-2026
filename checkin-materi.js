// checkin-materi.js
//
// Logika bersama untuk 6 halaman "Check-in <Materi>" (Senapan, Eksekutif,
// Falling Plate, IPSC, Non IPSC, Air Rifle). Tiap halaman HTML tinggal
// set `const MATERI_KEY = "senapan";` (dst) SEBELUM memuat file ini.
//
// Baris peserta HANYA muncul di sini kalau QR e-tiketnya SUDAH discan di
// Check-in Materi (checkinMateri === "Sudah") -- beda dengan data-
// peserta.html yang menampilkan SEMUA peserta terdaftar. Halaman ini
// dipakai operator penentu gelombang & lajur di venue, jadi yang relevan
// cuma siapa yang SUDAH datang dan check-in, bukan siapa yang baru
// terdaftar online. Permintaan Kang, 5 September 2026.
//
// Diurutkan ASCENDING berdasarkan Waktu Check In (siapa yang check-in
// duluan tampil duluan) supaya operator gampang bagi gelombang/lajur
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

const DATA_URL = "https://script.google.com/macros/s/AKfycbyGY8Pi3gBALM8GVP6XCB04P_eebPw2thlP_ShQR6IVC31vuCZcWXxQK677crIgHysu/exec?peserta=1";

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
  return q
    ? rows.filter(r => (r.nama || "").toLowerCase().includes(q) || (r.hp || "").toLowerCase().includes(q))
    : rows;
}

function tabelSubMateriHtml(rows) {
  const kolomExtra = materi.showIpscExtra
    ? `<th>Power Factor</th><th>Kategori</th><th>Waktu Pelaksanaan</th>`
    : "";
  if (!rows.length) {
    return `<div class="table-wrap"><table><tbody><tr class="empty-row"><td colspan="6">Belum ada peserta check-in di sub-materi ini.</td></tr></tbody></table></div>`;
  }
  // Urut ASCENDING waktu check-in (siapa datang duluan tampil duluan).
  const sorted = rows.slice().sort((a, b) => (a.waktuCheckinRaw || "").localeCompare(b.waktuCheckinRaw || ""));
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="num">No.</th>
            <th>Nama</th>
            <th>No HP</th>
            <th>Golongan</th>
            <th>Waktu Check In</th>
            ${kolomExtra}
          </tr>
        </thead>
        <tbody>
          ${sorted.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td class="nama">${escapeHtml(r.nama)}</td>
              <td class="hp">${waLink(r.hp)}</td>
              <td>${escapeHtml(r.golongan)}</td>
              <td class="waktu-cell">${escapeHtml(r.waktuCheckin)}</td>
              ${materi.showIpscExtra ? `
              <td>${escapeHtml(r.powerFactor)}</td>
              <td>${escapeHtml(r.kategoriIpsc)}</td>
              <td>${escapeHtml(r.waktuPelaksanaan)}</td>
              ` : ""}
            </tr>
          `).join("")}
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
        <span class="kat-count">${irows.length} sudah check-in</span>
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
    ["waktuCheckin", "Waktu Check In"],
    ["powerFactor", "Power Factor (IPSC)"], ["kategoriIpsc", "Kategori (IPSC)"], ["waktuPelaksanaan", "Waktu Pelaksanaan (IPSC)"]
  ];
  const aoa = [kolom.map(k => k[1])];
  rows.forEach((r, i) => { aoa.push(kolom.map(k => k[0] === "no" ? i + 1 : (r[k[0]] == null ? "" : r[k[0]]))); });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = kolom.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Check In " + materi.judul);
  const tanggal = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, "checkin-" + MATERI_KEY + "-ltp-tni-2026-" + tanggal + ".xlsx");
}

function render() {
  const rows = filteredRows();
  document.getElementById("countBadge").textContent = rows.length + " sudah check-in";
  document.getElementById("katSections").innerHTML = tabelHtml(rows);
}

async function muatData() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.pesan || "Gagal memuat data.");
    allRows = json.rows || [];
    render();
    const now = new Date();
    document.getElementById("lastSync").textContent = "Terakhir diperbarui: " + now.toLocaleTimeString("id-ID", { hour12: false });
  } catch (err) {
    document.getElementById("katSections").innerHTML =
      `<div class="table-wrap"><table><tbody><tr class="empty-row"><td>Gagal terhubung ke server: ${escapeHtml(err.message || err)}</td></tr></tbody></table></div>`;
  }
}

document.title = "LTP TNI 2026 — Check In " + materi.judul;
document.getElementById("pageTitle").textContent = "Check In — " + materi.judul;
document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("downloadBtn").addEventListener("click", downloadXlsx);

muatData();
setInterval(muatData, 15000);
