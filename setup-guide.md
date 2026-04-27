# 📖 Panduan Setup Google Sheets + Drive + Apps Script

## Langkah 1: Siapkan Google Sheet

Buka Google Sheet Anda:
https://docs.google.com/spreadsheets/d/1SBsjwFKzSjLelgJimRdO4oiszqAv5ETjdpub_b3aZkI

### Buat 2 Sheet (Tab):

**Tab 1: `Users`**
Buat header di baris pertama:

| A | B | C | D |
|---|---|---|---|
| Username | PIN | Name | Role |
| bendahara | 1234 | Pak Ahmad | bendahara |
| marbot | 5678 | Mas Budi | marbot |

**Tab 2: `Transactions`**
Buat header di baris pertama:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| ID | Date | Type | Category | Amount | Description | FileURL | InputBy | InputRole | Timestamp |

> ⚠️ PENTING: Nama tab HARUS persis `Users` dan `Transactions` (case-sensitive)

---

## Langkah 2: Pasang Apps Script

1. Di Google Sheet, klik menu **Extensions → Apps Script**
2. Hapus semua kode default di editor
3. Buka file `Code.gs` dari folder project ini (`d:\kas-mai\Code.gs`)
4. Copy SELURUH isinya, paste ke Apps Script editor
5. Klik **Save** (Ctrl+S)
6. Beri nama project: `Masjid Al-Ikhlas Finance API`

---

## Langkah 3: Jalankan Setup Awal

1. Di Apps Script editor, pilih fungsi `setupSheets` dari dropdown
2. Klik **Run** (▶️)
3. Akan muncul popup **Authorization required** → Klik **Review Permissions**
4. Pilih akun Google Anda
5. Klik **Advanced** → **Go to Masjid Al-Ikhlas Finance API (unsafe)**
6. Klik **Allow**

> Ini memberi izin Apps Script mengakses Sheet dan Drive Anda

---

## Langkah 4: Deploy sebagai Web App

1. Klik **Deploy** → **New deployment**
2. Klik ikon ⚙️ → pilih **Web app**
3. Isi:
   - **Description**: `Masjid Al-Ikhlas API v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Klik **Deploy**
5. **COPY URL** yang muncul (format: `https://script.google.com/macros/s/XXXXX/exec`)

---

## Langkah 5: Konfigurasi Frontend

1. Buka file `d:\kas-mai\config.js`
2. Ganti `YOUR_APPS_SCRIPT_URL_HERE` dengan URL yang Anda copy:

```js
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/XXXXX/exec',
  ...
};
```

3. Save file

---

## Langkah 6: Test

1. Buka `d:\kas-mai\index.html` di browser
2. Login dengan:
   - Bendahara: `bendahara` / `1234`
   - Marbot: `marbot` / `5678`
3. Coba tambah transaksi dengan upload bukti
4. Cek Google Sheet → data harus muncul di tab Transactions
5. Cek Google Drive folder → file bukti harus ter-upload

---

## Troubleshooting

### Error "Apps Script URL belum dikonfigurasi"
→ Anda belum paste URL di `config.js`

### Error "Gagal terhubung ke server"
→ Pastikan URL deployment benar dan sudah di-deploy sebagai Web App

### Error saat login
→ Pastikan tab `Users` sudah ada dengan data yang benar

### File tidak terupload
→ Pastikan Google Drive folder ID benar dan Anda punya akses write

### Setelah update Code.gs
→ Anda HARUS buat **New deployment** lagi (bukan edit yang lama) agar perubahan berlaku

---

## Menambah User Baru

Cukup tambahkan baris baru di tab `Users` di Google Sheet:

| Username | PIN | Name | Role |
|----------|-----|------|------|
| ustadz | 9999 | Ustadz Ali | bendahara |

Role yang tersedia: `bendahara`, `marbot` (keduanya akses penuh)
