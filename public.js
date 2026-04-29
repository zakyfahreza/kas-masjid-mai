// ============================================
// Masjid Al-Ikhlas Finance - Public Logic
// ============================================

let pubChart = null;
let publicTransactions = [];

const API = {
  async get(action = 'getTransactions') {
    const url = CONFIG.APPS_SCRIPT_URL + '?action=' + action;
    if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
      throw new Error('Apps Script URL belum dikonfigurasi! Buka config.js');
    }
    const res = await fetch(url);
    return res.json();
  }
};

function formatRp(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }

function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(-20px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

const colorPalette = [
  '#38A169', '#3182CE', '#D69E2E', '#E53E3E', '#805AD5', '#D53F8C', '#319795', '#DD6B20', '#4A5568', '#F56565'
];

async function loadPublicData() {
  const btn = document.getElementById('refreshBtn');
  btn.style.opacity = '0.5';
  btn.style.pointerEvents = 'none';
  
  try {
    const res = await API.get('getTransactions');
    if (res.success) {
      publicTransactions = res.data || [];
      populateMonthFilter();
      filterPublicDataByMonth();
      document.getElementById('lastUpdated').textContent = 'Terakhir diperbarui: ' + new Date().toLocaleString('id-ID');
    } else {
      showToast('Gagal memuat data', 'error');
    }
  } catch (e) {
    showToast('Gagal terhubung ke server', 'error');
  }
  
  document.getElementById('loadingOverlay').classList.remove('active');
  btn.style.opacity = '1';
  btn.style.pointerEvents = 'auto';
}

function renderPublicData(txs) {
  let income = 0;
  let expense = 0;
  const incomeCats = {};
  const expenseCats = {};

  txs.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      income += amt;
      incomeCats[t.category] = (incomeCats[t.category] || 0) + amt;
    } else if (t.type === 'expense') {
      expense += amt;
      expenseCats[t.category] = (expenseCats[t.category] || 0) + amt;
    }
  });

  document.getElementById('pubBalance').textContent = formatRp(income - expense);
  document.getElementById('pubIncome').textContent = formatRp(income);
  document.getElementById('pubExpense').textContent = formatRp(expense);

  renderChart(incomeCats, expenseCats);
  renderCategoryList('incomeList', incomeCats, 'income');
  renderCategoryList('expenseList', expenseCats, 'expense');
}

function renderCategoryList(containerId, cats, type) {
  const container = document.getElementById(containerId);
  const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  
  if (sortedCats.length === 0) {
    container.innerHTML = '<div style="text-align:center;font-size:13px;color:var(--text-secondary);padding:12px;">Belum ada data</div>';
    return;
  }

  let html = '';
  sortedCats.forEach((item, index) => {
    const color = colorPalette[index % colorPalette.length];
    html += `
      <div class="cat-item">
        <div class="cat-name">
          <div class="color-dot" style="background:${color}"></div>
          ${item[0]}
        </div>
        <div class="cat-amount ${type}">${formatRp(item[1])}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderChart(incomeCats, expenseCats) {
  const ctx = document.getElementById('pubChart');
  if (pubChart) pubChart.destroy();

  const labels = ['Pemasukan', 'Pengeluaran'];
  const incomeData = Object.values(incomeCats).reduce((a, b) => a + b, 0);
  const expenseData = Object.values(expenseCats).reduce((a, b) => a + b, 0);

  pubChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: [incomeData, expenseData],
        backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(239,68,68,0.8)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ' ' + context.label + ': ' + formatRp(context.raw);
            }
          }
        }
      }
    }
  });
}

function populateMonthFilter() {
  const select = document.getElementById('publicMonthFilter');
  if (!select) return;
  const months = new Set();
  
  publicTransactions.forEach(t => {
    if (t.date) {
      months.add(t.date.substring(0, 7)); // YYYY-MM
    }
  });

  const availableMonths = Array.from(months).sort().reverse(); // Newest first
  const currentVal = select.value;
  
  let html = '<option value="all">Semua Bulan</option>';
  availableMonths.forEach(m => {
    const [year, month] = m.split('-');
    const dateObj = new Date(year, parseInt(month) - 1, 1);
    const monthName = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    html += `<option value="${m}">${monthName}</option>`;
  });
  
  select.innerHTML = html;

  // Set default selection
  if (currentVal && currentVal !== 'all' && availableMonths.includes(currentVal)) {
    select.value = currentVal;
  } else if (currentVal === 'all') {
    select.value = 'all';
  } else if (availableMonths.length > 0) {
    const today = new Date();
    const currentMonthStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    if (availableMonths.includes(currentMonthStr)) {
      select.value = currentMonthStr;
    } else {
      select.value = availableMonths[0]; // Or latest
    }
  }
}

function getFilteredPublicData() {
  const select = document.getElementById('publicMonthFilter');
  const val = select ? select.value : 'all';
  if (val === 'all') return publicTransactions;
  return publicTransactions.filter(t => t.date && t.date.startsWith(val));
}

function filterPublicDataByMonth() {
  renderPublicData(getFilteredPublicData());
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadPublicData();
  
  // Auto refresh every 5 minutes (300000 ms)
  setInterval(loadPublicData, 300000);
});

function copyRekening() {
  const rek = document.getElementById('rekeningNumber').innerText;
  navigator.clipboard.writeText(rek).then(() => {
    showToast('Nomor rekening berhasil disalin!');
  }).catch(err => {
    showToast('Gagal menyalin nomor rekening', 'error');
  });
}

function exportPublicPDF() {
  const txs = getFilteredPublicData();
  if (txs.length === 0) {
    showToast('Data belum tersedia', 'error');
    return;
  }

  let income = 0;
  let expense = 0;
  const incomeCats = {};
  const expenseCats = {};

  txs.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') {
      income += amt;
      incomeCats[t.category] = (incomeCats[t.category] || 0) + amt;
    } else if (t.type === 'expense') {
      expense += amt;
      expenseCats[t.category] = (expenseCats[t.category] || 0) + amt;
    }
  });

  const sortedInc = Object.entries(incomeCats).sort((a, b) => b[1] - a[1]);
  const sortedExp = Object.entries(expenseCats).sort((a, b) => b[1] - a[1]);

  let html = `<div style="font-family:Inter,sans-serif;padding:20px;max-width:800px;margin:0 auto;">
    <h2 style="color:#2E7D32;text-align:center;margin-bottom:8px;">🕌 Laporan Kas Masjid Al-Ikhlas</h2>
    <p style="text-align:center;color:#666;font-size:12px;margin-top:0;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
    <hr style="margin:16px 0;border-color:#E5E7EB">
    
    <div style="display:flex;gap:20px;margin-bottom:24px">
      <div style="flex:1;padding:16px;background:#E8F5E9;border-radius:8px;text-align:center;">
        <div style="font-size:12px;color:#666;margin-bottom:4px;">Total Pemasukan</div>
        <strong style="font-size:18px;color:#38A169;">${formatRp(income)}</strong>
      </div>
      <div style="flex:1;padding:16px;background:#FEE2E2;border-radius:8px;text-align:center;">
        <div style="font-size:12px;color:#666;margin-bottom:4px;">Total Pengeluaran</div>
        <strong style="font-size:18px;color:#E53E3E;">${formatRp(expense)}</strong>
      </div>
      <div style="flex:1;padding:16px;background:#F0F9FF;border-radius:8px;text-align:center;">
        <div style="font-size:12px;color:#666;margin-bottom:4px;">Saldo Akhir</div>
        <strong style="font-size:18px;color:#3182CE;">${formatRp(income - expense)}</strong>
      </div>
    </div>
    
    <div style="display:flex;gap:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:300px;">
        <h3 style="color:#38A169;margin-bottom:12px;font-size:16px;border-bottom:1px solid #eee;padding-bottom:8px;">Rincian Pemasukan</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            ${sortedInc.map(item => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${item[0]}</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatRp(item[1])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="flex:1;min-width:300px;">
        <h3 style="color:#E53E3E;margin-bottom:12px;font-size:16px;border-bottom:1px solid #eee;padding-bottom:8px;">Rincian Pengeluaran</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            ${sortedExp.map(item => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${item[0]}</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatRp(item[1])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;

  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Laporan Keuangan Publik MAI</title></head><body>${html}<script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
}
