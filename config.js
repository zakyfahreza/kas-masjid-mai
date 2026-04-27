// ============================================
// Masjid Al-Ikhlas Finance - Konfigurasi
// ============================================
// PENTING: Ganti URL di bawah dengan URL deployment Apps Script Anda
// Cara mendapatkan URL:
// 1. Buka Apps Script editor
// 2. Deploy → New Deployment → Web App
// 3. Copy URL yang diberikan
// ============================================

const CONFIG = {
  // URL Google Apps Script Web App
  // Format: https://script.google.com/macros/s/XXXXXXXXX/exec
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzg9Aj3XWQFB5CueoZuX-c9EcMeLuQpb_HBcDPZ--oJQUrNd_0Ru5M7-D59NvXO_Opo/exec',

  // Google Sheet ID (sudah diset)
  SHEET_ID: '1SBsjwFKzSjLelgJimRdO4oiszqAv5ETjdpub_b3aZkI',

  // Google Drive Folder ID (sudah diset)
  DRIVE_FOLDER_ID: '1HlRVClPob17_dl0eGeaBWzuM_Y84Ft7T',

  // Max file size (5MB)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
};
