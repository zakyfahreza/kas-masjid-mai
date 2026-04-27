// ============================================
// Masjid Al-Ikhlas Finance - App Logic
// Google Sheets + Drive Integration
// ============================================

let currentUser = null; // { username, name, role }
let currentPage = 'dashboard';
let mainChart = null;
let deleteTargetId = null;
let cachedTransactions = [];

// --- API LAYER ---
const API = {
  async post(action, data = {}) {
    const url = CONFIG.APPS_SCRIPT_URL;
    if (!url || url === 'YOUR_APPS_SCRIPT_URL_HERE') {
      throw new Error('Apps Script URL belum dikonfigurasi! Buka config.js');
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...data })
    });
    return res.json();
  },
  async get(action = 'getTransactions') {
    const url = CONFIG.APPS_SCRIPT_URL + '?action=' + action;
    if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      throw new Error('Apps Script URL belum dikonfigurasi! Buka config.js');
    }
    const res = await fetch(url);
    return res.json();
  }
};

// --- FORMAT HELPERS ---
function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function parseRp(str) { 
  if (!str) return 0;
  return Number(String(str).replace(/[^0-9]/g, '')); 
}
function formatInputRp(e) {
  let val = parseRp(e.target.value);
  if (val === 0) { e.target.value = ''; return; }
  e.target.value = formatRp(val);
}
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
}
function getCategoryIcon(cat) {
  const svg = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
  
  const m = {
    'Infaq Jumat': svg('M3 21h18M5 21v-8M19 21v-8M9 21v-4h6v4M5 10l7-5 7 5M12 2v3'), // Mosque-like
    'Infaq Harian': svg('M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6M4 12l8-4 8 4M12 15v.01'), // Box
    'Zakat': svg('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'), // Dollar sign / Money
    'Sedekah': svg('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'), // Heart
    'Donasi': svg('M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6M4 12l8-4 8 4M12 15v.01'), // Box
    'Listrik': svg('M13 2L3 14h9l-1 8 10-12h-9l1-8z'), // Lightning
    'Air': svg('M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'), // Droplet
    'Kebersihan': svg('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'), // Trash/Box
    'Perbaikan': svg('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'), // Wrench
    'Kegiatan': svg('M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z'), // Calendar
    'Gaji Marbot': svg('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'), // User
    'Mukafaah Ustadz': svg('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z') // User
  };
  
  const defaultIcon = svg('M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z'); // File
  return m[cat] || defaultIcon;
}

// --- TOAST ---
function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(-20px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

// --- NAVIGATION ---
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('#mainApp .page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(page + 'Page');
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  if (page === 'dashboard') renderDashboard();
  if (page === 'history') renderHistory();
  if (page === 'reports') renderReports();
  if (page === 'add') resetForm();
}

// --- AUTH ---
async function handleLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pin = document.getElementById('loginPin').value.trim();
  let valid = true;
  document.querySelectorAll('.login-card .form-group').forEach(g => g.classList.remove('has-error'));
  if (!user) { document.getElementById('loginUser').closest('.form-group').classList.add('has-error'); valid = false; }
  if (!pin || pin.length < 4) { document.getElementById('loginPin').closest('.form-group').classList.add('has-error'); valid = false; }
  if (!valid) return;

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Memverifikasi...';

  try {
    const res = await API.post('login', { username: user, pin: pin });
    if (res.success) {
      currentUser = res.user;
      if (document.getElementById('rememberMe').checked) {
        localStorage.setItem('mai_user', JSON.stringify(currentUser));
      }
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      document.getElementById('headerGreeting').textContent = "Assalamu'alaikum, " + currentUser.name;
      document.getElementById('roleBadge').textContent = currentUser.role === 'bendahara' ? 'Bendahara' : 'Marbot';
      showToast("Assalamu'alaikum, " + currentUser.name + '!');
      await loadTransactions();
      renderDashboard();
    } else {
      showToast(res.error || 'Login gagal!', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke server: ' + e.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = 'Masuk';
}

function handleLogout() {
  currentUser = null;
  cachedTransactions = [];
  localStorage.removeItem('mai_user');
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginPage').style.display = 'block';
  showToast('Anda telah logout', 'warning');
}

// --- LOAD TRANSACTIONS FROM GOOGLE SHEETS ---
async function loadTransactions() {
  try {
    const res = await API.get('getTransactions');
    if (res.success) {
      cachedTransactions = res.data || [];
    } else {
      showToast('Gagal memuat data: ' + (res.error || ''), 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke server', 'error');
  }
}

// --- DASHBOARD ---
function renderDashboard() {
  const txs = cachedTransactions;
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  document.getElementById('totalIncome').textContent = formatRp(income);
  document.getElementById('totalExpense').textContent = formatRp(expense);
  document.getElementById('totalBalance').textContent = formatRp(income - expense);

  const list = document.getElementById('recentTxList');
  const recent = txs.slice(0, 5);
  list.innerHTML = recent.length === 0
    ? '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg></div><p>Belum ada transaksi</p></div>'
    : recent.map(t => txItemHTML(t)).join('');

  renderChart('bar');
}

function txItemHTML(t) {
  const icon = getCategoryIcon(t.category);
  const byInfo = t.inputBy ? `<span style="font-size:10px;color:var(--text-secondary);margin-left:4px">• ${t.inputBy}</span>` : '';
  return `<div class="tx-item" data-id="${t.id}" data-type="${t.type}" data-amount="${t.amount}" data-category="${t.category}" data-date="${t.date}" data-desc="${t.desc || ''}">
    <div class="tx-icon ${t.type}">${icon}</div>
    <div class="tx-info">
      <div class="tx-cat">${t.category}${byInfo}</div>
      <div class="tx-desc">${t.desc || '-'}</div>
    </div>
    <div class="tx-right">
      <div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${formatRp(t.amount)}</div>
      <div class="tx-date">${formatDate(t.date)}</div>
    </div>
    <div class="tx-actions">
      <button class="tx-action-btn edit-btn" onclick="event.stopPropagation();showEditModal(this.closest('.tx-item'))" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
      <button class="tx-action-btn delete-btn" onclick="event.stopPropagation();showDeleteModal(this.closest('.tx-item').dataset.id)" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
    </div>
  </div>`;
}

// --- CHART ---
function renderChart(type) {
  const txs = cachedTransactions;
  const ctx = document.getElementById('mainChart');
  if (mainChart) mainChart.destroy();

  if (type === 'bar') {
    const cats = {};
    txs.forEach(t => { if (!cats[t.category]) cats[t.category] = {income:0,expense:0}; cats[t.category][t.type] += Number(t.amount); });
    const labels = Object.keys(cats);
    mainChart = new Chart(ctx, {
      type:'bar', data:{ labels, datasets:[
        {label:'Pemasukan', data:labels.map(l => cats[l].income), backgroundColor:'rgba(16,185,129,0.7)', borderRadius:6},
        {label:'Pengeluaran', data:labels.map(l => cats[l].expense), backgroundColor:'rgba(239,68,68,0.7)', borderRadius:6}
      ]}, options:{responsive:true, plugins:{legend:{position:'bottom',labels:{font:{family:'Inter',size:11}}}}, scales:{y:{beginAtZero:true,ticks:{callback:v=>'Rp '+(v/1000000).toFixed(1)+'jt'}}}}
    });
  } else {
    const inc = txs.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const exp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    mainChart = new Chart(ctx, {
      type:'doughnut', data:{ labels:['Pemasukan','Pengeluaran'], datasets:[{data:[inc,exp], backgroundColor:['rgba(16,185,129,0.8)','rgba(239,68,68,0.8)'], borderWidth:0}] },
      options:{responsive:true, plugins:{legend:{position:'bottom',labels:{font:{family:'Inter',size:12}}}}}
    });
  }
}

// --- ADD TRANSACTION ---
let selectedFile = null;

function resetForm() {
  document.getElementById('txForm').reset();
  document.getElementById('txType').value = 'income';
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('btnIncome').className = 'type-btn active-income';
  document.getElementById('btnExpense').className = 'type-btn';
  document.getElementById('filePreview').classList.remove('show');
  document.querySelectorAll('#txForm .form-group').forEach(g => g.classList.remove('has-error'));
  selectedFile = null;
  filterCategories('income');
}

function handleTypeToggle(type) {
  document.getElementById('txType').value = type;
  document.getElementById('btnIncome').className = 'type-btn' + (type==='income'?' active-income':'');
  document.getElementById('btnExpense').className = 'type-btn' + (type==='expense'?' active-expense':'');
  filterCategories(type);
}

function filterCategories(type) {
  const select = document.getElementById('txCategory');
  const currentVal = select.value;
  
  const incomeOptions = [
    'Infaq Jumat', 'Infaq Harian', 'Zakat', 'Sedekah', 'Donasi', 'Lainnya'
  ];
  
  const expenseOptions = [
    'Listrik', 'Air', 'Kebersihan', 'Perbaikan', 'Kegiatan', 'Gaji Marbot', 'Mukafaah Ustadz', 'Lainnya'
  ];
  
  const options = type === 'income' ? incomeOptions : expenseOptions;
  const label = type === 'income' ? 'Pemasukan' : 'Pengeluaran';
  
  let html = '<option value="">-- Pilih Kategori --</option>';
  html += `<optgroup label="${label}">`;
  options.forEach(opt => {
    html += `<option value="${opt}">${opt}</option>`;
  });
  html += '</optgroup>';
  
  select.innerHTML = html;
  
  // Restore selection if it exists in the new options
  if (options.includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = '';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:xxx;base64, prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleSubmitTx() {
  const type = document.getElementById('txType').value;
  const amountStr = document.getElementById('txAmount').value;
  const amount = parseRp(amountStr);
  const category = document.getElementById('txCategory').value;
  const date = document.getElementById('txDate').value;
  const desc = document.getElementById('txDesc').value;

  let valid = true;
  document.querySelectorAll('#txForm .form-group').forEach(g => g.classList.remove('has-error'));
  if (!amount || amount <= 0) { document.getElementById('txAmount').closest('.form-group').classList.add('has-error'); valid = false; }
  if (!category) { document.getElementById('txCategory').closest('.form-group').classList.add('has-error'); valid = false; }
  if (!date) { document.getElementById('txDate').closest('.form-group').classList.add('has-error'); valid = false; }
  if (!valid) { showToast('Mohon lengkapi form!', 'error'); return; }

  const btn = document.getElementById('submitTx');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Menyimpan...';

  try {
    const payload = {
      type, amount, category, date, desc,
      inputBy: currentUser ? currentUser.name : 'Unknown',
      inputRole: currentUser ? currentUser.role : ''
    };

    // Convert file to Base64 if selected
    if (selectedFile) {
      payload.fileData = await fileToBase64(selectedFile);
      payload.fileName = selectedFile.name;
      payload.fileMimeType = selectedFile.type;
    }

    const res = await API.post('addTransaction', payload);
    if (res.success) {
      showToast('Transaksi berhasil disimpan! ✅');
      await loadTransactions(); // Refresh from server
      navigateTo('dashboard');
    } else {
      showToast(res.error || 'Gagal menyimpan!', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung: ' + e.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = '💾 Simpan Transaksi';
}

// --- HISTORY ---
function renderHistory() {
  const txs = cachedTransactions;
  const filter = document.getElementById('historyFilter').value;
  const search = document.getElementById('historySearch').value.toLowerCase();
  let filtered = txs;
  if (filter !== 'all') filtered = filtered.filter(t => t.type === filter);
  if (search) filtered = filtered.filter(t => t.category.toLowerCase().includes(search) || (t.desc||'').toLowerCase().includes(search) || (t.inputBy||'').toLowerCase().includes(search));

  const list = document.getElementById('historyTxList');
  list.innerHTML = filtered.length === 0
    ? '<div class="empty-state"><div class="empty-icon">🔍</div><p>Tidak ada transaksi ditemukan</p></div>'
    : filtered.map(t => txItemHTML(t)).join('');
}

// --- REPORTS ---
function renderReports() {
  const txs = cachedTransactions;
  const start = document.getElementById('reportStart').value;
  const end = document.getElementById('reportEnd').value;
  const cat = document.getElementById('reportCategory').value;
  const type = document.getElementById('reportType').value;
  let filtered = txs;
  if (start) filtered = filtered.filter(t => t.date >= start);
  if (end) filtered = filtered.filter(t => t.date <= end);
  if (cat !== 'all') filtered = filtered.filter(t => t.category === cat);
  if (type !== 'all') filtered = filtered.filter(t => t.type === type);

  const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  document.getElementById('reportSummary').innerHTML = `
    <div class="summary-card income"><div class="card-label">Pemasukan</div><div class="card-value">${formatRp(income)}</div></div>
    <div class="summary-card expense"><div class="card-label">Pengeluaran</div><div class="card-value">${formatRp(expense)}</div></div>`;

  const table = document.getElementById('reportTable');
  if (filtered.length === 0) {
    table.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Tidak ada data</p></div>';
    return;
  }
  table.innerHTML = `<table>
    <thead><tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Jumlah</th><th>Keterangan</th><th>Input Oleh</th><th>Bukti</th></tr></thead>
    <tbody>${filtered.map(t => `<tr>
      <td>${formatDate(t.date)}</td>
      <td><span class="badge ${t.type}">${t.type==='income'?'Masuk':'Keluar'}</span></td>
      <td>${t.category}</td>
      <td style="font-weight:600;color:${t.type==='income'?'var(--income)':'var(--expense)'}">${formatRp(t.amount)}</td>
      <td>${t.desc||'-'}</td>
      <td><span style="font-size:11px">${t.inputBy||'-'}</span></td>
      <td>${t.fileUrl?'<a href="'+t.fileUrl+'" target="_blank" class="link-btn">📎 Lihat</a>':'-'}</td>
    </tr>`).join('')}</tbody></table>`;
}

// --- EXPORT ---
function exportPDF() {
  const txs = getFilteredReportData();
  const income = txs.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
  let html = `<div style="font-family:Inter,sans-serif;padding:20px;max-width:800px">
    <h2 style="color:#2E7D32;text-align:center">🕌 Laporan Keuangan Masjid Al-Ikhlas</h2>
    <p style="text-align:center;color:#666;font-size:12px">Dicetak: ${new Date().toLocaleDateString('id-ID')} | Oleh: ${currentUser?currentUser.name:'-'}</p>
    <hr style="margin:16px 0;border-color:#E5E7EB">
    <div style="display:flex;gap:20px;margin-bottom:20px">
      <div style="flex:1;padding:12px;background:#E8F5E9;border-radius:8px"><strong>Pemasukan:</strong> ${formatRp(income)}</div>
      <div style="flex:1;padding:12px;background:#FEE2E2;border-radius:8px"><strong>Pengeluaran:</strong> ${formatRp(expense)}</div>
      <div style="flex:1;padding:12px;background:#F0F9FF;border-radius:8px"><strong>Saldo:</strong> ${formatRp(income-expense)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#2E7D32;color:#fff">
        <th style="padding:8px;text-align:left">Tanggal</th><th style="padding:8px">Tipe</th>
        <th style="padding:8px">Kategori</th><th style="padding:8px;text-align:right">Jumlah</th>
        <th style="padding:8px">Keterangan</th><th style="padding:8px">Input Oleh</th></tr></thead>
      <tbody>${txs.map((t,i)=>`<tr style="background:${i%2?'#f9f9f9':'#fff'}">
        <td style="padding:6px 8px">${formatDate(t.date)}</td>
        <td style="padding:6px 8px;text-align:center">${t.type==='income'?'✅ Masuk':'🔴 Keluar'}</td>
        <td style="padding:6px 8px">${t.category}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600">${formatRp(t.amount)}</td>
        <td style="padding:6px 8px">${t.desc||'-'}</td>
        <td style="padding:6px 8px">${t.inputBy||'-'}</td></tr>`).join('')}
      </tbody></table></div>`;
  const w = window.open('','_blank');
  w.document.write(`<html><head><title>Laporan Keuangan MAI</title></head><body>${html}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
}

function exportExcel() {
  const txs = getFilteredReportData();
  let csv = 'Tanggal,Tipe,Kategori,Jumlah,Keterangan,Input Oleh,Bukti URL\n';
  txs.forEach(t => { csv += `${t.date},${t.type==='income'?'Pemasukan':'Pengeluaran'},${t.category},${t.amount},"${t.desc||''}",${t.inputBy||''},${t.fileUrl||''}\n`; });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Laporan_MAI_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast('File CSV berhasil diunduh!');
}

function getFilteredReportData() {
  const txs = cachedTransactions;
  const start = document.getElementById('reportStart').value;
  const end = document.getElementById('reportEnd').value;
  const cat = document.getElementById('reportCategory').value;
  const type = document.getElementById('reportType').value;
  let f = txs;
  if (start) f = f.filter(t => t.date >= start);
  if (end) f = f.filter(t => t.date <= end);
  if (cat !== 'all') f = f.filter(t => t.category === cat);
  if (type !== 'all') f = f.filter(t => t.type === type);
  return f;
}

// --- DELETE ---
function showDeleteModal(id) { deleteTargetId = id; document.getElementById('deleteModal').classList.add('active'); }

async function handleDelete() {
  if (!deleteTargetId) return;
  const btn = document.getElementById('confirmDelete');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span>';
  try {
    const res = await API.post('deleteTransaction', { id: deleteTargetId });
    if (res.success) {
      showToast('Transaksi berhasil dihapus');
      await loadTransactions();
      if (currentPage === 'history') renderHistory();
      else if (currentPage === 'dashboard') renderDashboard();
      else if (currentPage === 'reports') renderReports();
    } else {
      showToast(res.error || 'Gagal menghapus', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung: ' + e.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = 'Hapus';
  deleteTargetId = null;
  document.getElementById('deleteModal').classList.remove('active');
}

// --- EDIT ---
function showEditModal(txEl) {
  document.getElementById('editId').value = txEl.dataset.id;
  document.getElementById('editType').value = txEl.dataset.type;
  document.getElementById('editAmount').value = formatRp(txEl.dataset.amount);
  document.getElementById('editCategory').value = txEl.dataset.category;
  document.getElementById('editDate').value = txEl.dataset.date;
  document.getElementById('editDesc').value = txEl.dataset.desc;
  document.getElementById('editModal').classList.add('active');
}

async function handleEdit() {
  const id = document.getElementById('editId').value;
  const type = document.getElementById('editType').value;
  const amountStr = document.getElementById('editAmount').value;
  const amount = parseRp(amountStr);
  const category = document.getElementById('editCategory').value;
  const date = document.getElementById('editDate').value;
  const desc = document.getElementById('editDesc').value;

  if (!amount || amount <= 0 || !category || !date) { showToast('Mohon lengkapi data!', 'error'); return; }

  const btn = document.getElementById('confirmEdit');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span>';
  try {
    const res = await API.post('editTransaction', { id, type, amount, category, date, desc });
    if (res.success) {
      showToast('Transaksi berhasil diupdate! ✅');
      document.getElementById('editModal').classList.remove('active');
      await loadTransactions();
      if (currentPage === 'history') renderHistory();
      else if (currentPage === 'dashboard') renderDashboard();
      else if (currentPage === 'reports') renderReports();
    } else {
      showToast(res.error || 'Gagal update', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung: ' + e.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = 'Simpan';
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
  // Check saved session
  const saved = localStorage.getItem('mai_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      document.getElementById('headerGreeting').textContent = "Assalamu'alaikum, " + currentUser.name;
      document.getElementById('roleBadge').textContent = currentUser.role === 'bendahara' ? 'Bendahara' : 'Marbot';
      loadTransactions().then(() => renderDashboard());
    } catch (e) { localStorage.removeItem('mai_user'); }
  }

  // Amount inputs auto-format
  document.getElementById('txAmount').addEventListener('input', formatInputRp);
  document.getElementById('editAmount').addEventListener('input', formatInputRp);

  // Login
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('loginPin').addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

  // Chart tabs
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderChart(tab.dataset.chart);
    });
  });

  // Type toggle
  document.getElementById('btnIncome').addEventListener('click', () => handleTypeToggle('income'));
  document.getElementById('btnExpense').addEventListener('click', () => handleTypeToggle('expense'));

  // File upload
  document.getElementById('txFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > CONFIG.MAX_FILE_SIZE) { showToast('File terlalu besar (maks 5MB)', 'error'); return; }
      selectedFile = file;
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('filePreview').classList.add('show');
    }
  });
  document.getElementById('removeFile').addEventListener('click', () => {
    selectedFile = null;
    document.getElementById('txFile').value = '';
    document.getElementById('filePreview').classList.remove('show');
  });

  // Submit
  document.getElementById('submitTx').addEventListener('click', handleSubmitTx);
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
  filterCategories('income'); // Default: show only income categories

  // History filters
  document.getElementById('historyFilter').addEventListener('change', renderHistory);
  document.getElementById('historySearch').addEventListener('input', renderHistory);

  // Report filters
  ['reportStart','reportEnd','reportCategory','reportType'].forEach(id => document.getElementById(id).addEventListener('change', renderReports));

  // Export
  document.getElementById('exportPdf').addEventListener('click', exportPDF);
  document.getElementById('exportExcel').addEventListener('click', exportExcel);

  // Delete modal
  document.getElementById('cancelDelete').addEventListener('click', () => { document.getElementById('deleteModal').classList.remove('active'); deleteTargetId = null; });
  document.getElementById('confirmDelete').addEventListener('click', handleDelete);

  // Edit modal
  document.getElementById('cancelEdit').addEventListener('click', () => { document.getElementById('editModal').classList.remove('active'); });
  document.getElementById('confirmEdit').addEventListener('click', handleEdit);
});
