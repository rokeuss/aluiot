// ═══════════════════════════════════════════════════════════
//  NIM BANK DASHBOARD  —  app.js
// ═══════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────
const State = {
  allTx: [],          // all parsed transactions for current year
  filteredTx: [],     // after search/filter
  currentYear: CONFIG.defaultYear,
  currentMonth: 'all',
  sortCol: 'date',
  sortDir: 'desc',
  charts: {},
};

// ── Category engine ────────────────────────────────────────
const CAT_RULES = [
  { cat: 'Salary',           test: d => /GLOBE INVEST|SALARY/i.test(d) },
  { cat: 'Investment Returns', test: (d,t) => /INTERACTIVE BROKERS|1BANK.*CREDIT/i.test(d) || /BOC TRANSFER/i.test(t) && /CREDIT/i.test(t) },
  { cat: 'Credits / Refunds', test: (d,t) => /CREDIT VOUCH/i.test(d) || /OTHER CREDIT/i.test(t) },
  { cat: 'Bank Fees',        test: (d,t) => /IBU.MAINTENANCE|MAINTENANCE FEE/i.test(d) || /COMMISSION.*FEE/i.test(t) },
  { cat: 'Groceries',        test: d => /SKLAVENITIS|ALPHAMEGA|METRO SUPER|ORANGE FRUIT|STEASA FRUIT|MARATHASA/i.test(d) },
  { cat: 'Dining & Food',    test: d => /WOLT|WOOD N.FIRE|PAUL CAFE|NEOCONVENIENCE|SO EASY|THREE F|COFFEE HOUSE|E-PAYMENTS/i.test(d) },
  { cat: 'Sports & Fitness', test: d => /PLAYTOMIC|FUTSAL|PADELPRO|THEPADEL|RACKET|G\.C\. SPORTS/i.test(d) },
  { cat: 'Subscriptions',    test: d => /NETFLIX|SPOTIFY|GOOGLE ONE|YOUTUBE|TRADINGVIEW|CLAUDE\.AI|CHATGPT|OPENAI|AWSEMEA|ROBLOX/i.test(d) },
  { cat: 'Trading Tools',    test: d => /TRADEIFY|BULENOX|TAKEPROFITT|BWOOST/i.test(d) },
  { cat: 'Fuel',             test: d => /ESSO|RAMOIL/i.test(d) },
  { cat: 'Home & Hardware',  test: d => /IKEA|LEROY MERLIN|SUPERHOME|BIONIC|VICAN|FOUR DAY CLEARANCE|AYKCO|STEPHANIS|SOLONION/i.test(d) },
  { cat: 'Security (CCTV)', test: d => /CCTV|CHRISONS/i.test(d) },
  { cat: 'Utilities & Bills',test: d => /CYTA|CABLENET|WATER BOARD|EOANICOSIA|SOCIAL INSURANCE/i.test(d) },
  { cat: 'Travel & Transport',test:d => /ISRAIR|LARNACA AIRPORT|FACTORY K|THEMOC PARKING|WIZZ/i.test(d) },
  { cat: 'Cash Withdrawals', test: d => /ATM|CASH WITHDRAWAL|WITHDRAWAL AM 6011|WITHDRAWAL AM 6012/i.test(d) },
  { cat: 'Revolut Transfers',test: d => /REVOLUT/i.test(d) },
  { cat: 'Shopping & Clothing',test:d=> /ZARA|OYSHO|JD SPORTS|BEAUTY BAR|DOTERRA|ANCHORBSHOP|MILAS|DUTY FREE|SKROUTZ|AMZN|AMAZON PRIME|GGLZ6V/i.test(d) },
  { cat: 'Education & Family',test:d=> /ELLINOMATHEIA|FEBE APP/i.test(d) },
  { cat: 'Internal Transfer',test:(d,t)=> /BOC TRANSFER/i.test(t) },
  { cat: 'FX Fees',          test:(d,t)=> /CARDTXNADMIN|CASH ADV FEE/i.test(d) || /OTHER DEBIT/i.test(t) },
  { cat: 'Payments',         test:(d,t)=> /TIPS/i.test(t) },
];

function categorize(desc, txType) {
  for (const r of CAT_RULES) {
    if (r.test(desc || '', txType || '')) return r.cat;
  }
  return 'Other';
}

function cleanMerchant(desc) {
  if (!desc) return '';
  let s = desc
    .replace(/\s+PURCHASE\s+.*/i, '')
    .replace(/INWARD\s+\S+\s+by\s+/i, 'FROM: ')
    .replace(/CardTxnAdmin\s+/i, 'FX Fee: ')
    .replace(/Cash Adv Fee\s+/i, 'Cash Fee: ')
    .replace(/^[A-Z]{2}\s+\d{4}\s+/, '')
    .replace(/\s{2,}/g, ' ').trim();
  return s.slice(0, 55);
}

// ── CSV Parser ──────────────────────────────────────────────
function parseCSV(csvText, year) {
  const results = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = results.data;
  const tx = [];

  // Find header row: look for a row that contains 'Date' and 'Debit'
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i].map(c => String(c).trim().toLowerCase());
    if (r.includes('date') && (r.includes('debit') || r.includes('credit'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    // Fallback: try our normalized format (Date,Description,Transaction_Type,Reference,Debit,Credit,Balance)
    headerIdx = 0;
  }

  const headers = rows[headerIdx].map(c => String(c).trim().toLowerCase());
  const colIdx = {
    date:     headers.findIndex(h => h === 'date'),
    desc:     headers.findIndex(h => h.includes('description') || h === 'description'),
    txType:   headers.findIndex(h => h.includes('transaction_type') || h.includes('transaction type')),
    ref:      headers.findIndex(h => h.includes('reference')),
    debit:    headers.findIndex(h => h === 'debit' || h === 'debit (€)' || h.startsWith('debit')),
    credit:   headers.findIndex(h => h === 'credit' || h === 'credit (€)' || h.startsWith('credit')),
    balance:  headers.findIndex(h => h.includes('balance') || h.includes('indicative')),
  };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[colIdx.date]) continue;

    const rawDate = String(row[colIdx.date] || '').trim();
    if (!rawDate || rawDate.toLowerCase() === 'date') continue;

    let dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) continue;

    const desc    = String(row[colIdx.desc]    || '').trim();
    const txType  = String(row[colIdx.txType]  || '').trim();
    const debit   = parseFloat(row[colIdx.debit])  || 0;
    const credit  = parseFloat(row[colIdx.credit]) || 0;
    const balance = parseFloat(row[colIdx.balance]) || 0;

    if (debit === 0 && credit === 0) continue;

    tx.push({
      id:       `${year}-${i}`,
      date:     dateObj,
      dateStr:  dateObj.toISOString().slice(0, 10),
      month:    dateObj.toLocaleString('en', { month: 'short', year: 'numeric' }),
      monthKey: `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`,
      desc,
      merchant: cleanMerchant(desc),
      txType,
      debit,
      credit,
      balance,
      category: categorize(desc, txType),
      year,
      sourceFile: CONFIG.files[year],
    });
  }

  return tx;
}

// ── Category colors ─────────────────────────────────────────
const CAT_STYLE = {
  'Groceries':           { bg:'#D1FAE5', fg:'#065F46', accent:'#10B981' },
  'Home & Hardware':     { bg:'#DBEAFE', fg:'#1E3A8A', accent:'#3B82F6' },
  'Dining & Food':       { bg:'#FEF9C3', fg:'#854D0E', accent:'#F59E0B' },
  'Sports & Fitness':    { bg:'#FCE7F3', fg:'#9D174D', accent:'#EC4899' },
  'Subscriptions':       { bg:'#EDE9FE', fg:'#5B21B6', accent:'#8B5CF6' },
  'Trading Tools':       { bg:'#FEF3C7', fg:'#92400E', accent:'#D97706' },
  'Fuel':                { bg:'#FEE2E2', fg:'#991B1B', accent:'#EF4444' },
  'Utilities & Bills':   { bg:'#CCFBF1', fg:'#134E4A', accent:'#14B8A6' },
  'Travel & Transport':  { bg:'#E0F2FE', fg:'#0C4A6E', accent:'#0EA5E9' },
  'Cash Withdrawals':    { bg:'#F1F5F9', fg:'#334155', accent:'#64748B' },
  'Shopping & Clothing': { bg:'#FDF4FF', fg:'#6B21A8', accent:'#A855F7' },
  'Education & Family':  { bg:'#ECFDF5', fg:'#166534', accent:'#22C55E' },
  'Security (CCTV)':    { bg:'#FFF7ED', fg:'#9A3412', accent:'#F97316' },
  'Revolut Transfers':   { bg:'#F0F9FF', fg:'#0C4A6E', accent:'#38BDF8' },
  'Bank Fees':           { bg:'#FEE2E2', fg:'#991B1B', accent:'#F87171' },
  'FX Fees':             { bg:'#FFFBEB', fg:'#78350F', accent:'#FBBF24' },
  'Salary':              { bg:'#DCFCE7', fg:'#14532D', accent:'#4ADE80' },
  'Investment Returns':  { bg:'#E0F2FE', fg:'#0C4A6E', accent:'#38BDF8' },
  'Credits / Refunds':   { bg:'#D1FAE5', fg:'#065F46', accent:'#34D399' },
  'Internal Transfer':   { bg:'#F1F5F9', fg:'#475569', accent:'#94A3B8' },
  'Payments':            { bg:'#FFF7ED', fg:'#9A3412', accent:'#FB923C' },
  'Other':               { bg:'#F8FAFC', fg:'#475569', accent:'#94A3B8' },
};

function getCatStyle(cat) {
  return CAT_STYLE[cat] || CAT_STYLE['Other'];
}

function fmt(n) {
  if (!n || n === 0) return '—';
  return '€' + n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Lock screen ────────────────────────────────────────────
(function setupLock() {
  let pin = '';
  const dots = [0,1,2,3].map(i => document.getElementById(`d${i}`));
  const errEl = document.getElementById('lock-error');

  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
  }

  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = btn.dataset.n;
      if (n === 'clear') { pin = pin.slice(0, -1); }
      else if (n === 'ok') { checkPin(); return; }
      else if (pin.length < 4) { pin += n; }
      updateDots();
      if (pin.length === 4) setTimeout(checkPin, 150);
    });
  });

  // Keyboard support
  document.addEventListener('keydown', e => {
    if (document.getElementById('lock-screen').classList.contains('hidden')) return;
    if (e.key >= '0' && e.key <= '9' && pin.length < 4) { pin += e.key; updateDots(); if (pin.length === 4) setTimeout(checkPin, 150); }
    if (e.key === 'Backspace') { pin = pin.slice(0,-1); updateDots(); }
    if (e.key === 'Enter') checkPin();
  });

  function checkPin() {
    if (pin === CONFIG.PIN) {
      document.getElementById('lock-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      init();
    } else {
      errEl.textContent = 'Incorrect PIN. Try again.';
      pin = '';
      updateDots();
      setTimeout(() => errEl.textContent = '', 2000);
    }
  }
})();

// ── Sidebar & navigation ────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    const view = el.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    document.getElementById('page-title').textContent = el.textContent.trim();
    if (view === 'transactions') renderTransactions();
    if (view === 'categories')   renderCategories();
    if (view === 'monthly')      renderMonthly();
    if (view === 'dashboard')    renderDashboard();
    // close sidebar on mobile
    if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Year selector ────────────────────────────────────────────
const yearSelect = document.getElementById('year-select');
Object.keys(CONFIG.files).sort((a,b) => b-a).forEach(y => {
  const opt = document.createElement('option');
  opt.value = y; opt.textContent = y;
  if (y === CONFIG.defaultYear) opt.selected = true;
  yearSelect.appendChild(opt);
});
yearSelect.addEventListener('change', () => {
  State.currentYear = yearSelect.value;
  State.currentMonth = 'all';
  loadYear(State.currentYear);
});

// ── Search & filter ──────────────────────────────────────────
let searchTimer;
document.getElementById('search-input').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    applyFilters();
    renderTransactions();
  }, 200);
});
document.getElementById('filter-type').addEventListener('change', () => { applyFilters(); renderTransactions(); });
document.getElementById('filter-cat').addEventListener('change',  () => { applyFilters(); renderTransactions(); });

// ── Load year data ───────────────────────────────────────────
function loadYear(year) {
  const url = CONFIG.files[year];
  if (!url) return;
  document.getElementById('loading-overlay').classList.remove('hidden');

  fetch(url + '?t=' + Date.now())
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
    .then(text => {
      State.allTx = parseCSV(text, year);
      State.filteredTx = [...State.allTx];
      buildMonthPills();
      buildCatFilter();
      renderDashboard();
      document.getElementById('last-updated').textContent =
        `${State.allTx.length} transactions`;
    })
    .catch(err => {
      console.error('Load error:', err);
      document.getElementById('last-updated').textContent = 'Load error';
    })
    .finally(() => {
      document.getElementById('loading-overlay').classList.add('hidden');
    });
}

function buildMonthPills() {
  const months = [...new Set(State.allTx.map(t => t.monthKey))].sort().reverse();
  const container = document.getElementById('month-pills');
  container.innerHTML = '';

  const all = document.createElement('button');
  all.className = 'month-pill active';
  all.textContent = 'All';
  all.dataset.month = 'all';
  container.appendChild(all);

  months.forEach(mk => {
    const tx0 = State.allTx.find(t => t.monthKey === mk);
    const btn = document.createElement('button');
    btn.className = 'month-pill';
    btn.textContent = tx0?.month || mk;
    btn.dataset.month = mk;
    container.appendChild(btn);
  });

  container.querySelectorAll('.month-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.month-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.currentMonth = btn.dataset.month;
      applyFilters();
      renderDashboard();
      renderTransactions();
    });
  });
}

function buildCatFilter() {
  const cats = [...new Set(State.allTx.map(t => t.category))].sort();
  const sel = document.getElementById('filter-cat');
  sel.innerHTML = '<option value="">All Categories</option>';
  cats.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
}

function applyFilters() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const type   = document.getElementById('filter-type').value;
  const cat    = document.getElementById('filter-cat').value;

  State.filteredTx = State.allTx.filter(t => {
    if (State.currentMonth !== 'all' && t.monthKey !== State.currentMonth) return false;
    if (type === 'debit'  && t.debit  === 0) return false;
    if (type === 'credit' && t.credit === 0) return false;
    if (cat && t.category !== cat) return false;
    if (search && !t.merchant.toLowerCase().includes(search) &&
                  !t.desc.toLowerCase().includes(search) &&
                  !t.category.toLowerCase().includes(search)) return false;
    return true;
  });
}

// ── Dashboard ────────────────────────────────────────────────
function getTx() {
  if (State.currentMonth === 'all') return State.allTx;
  return State.allTx.filter(t => t.monthKey === State.currentMonth);
}

function renderDashboard() {
  const tx = getTx();
  const income   = tx.reduce((s,t) => s + t.credit, 0);
  const expenses = tx.reduce((s,t) => s + t.debit,  0);
  const net      = income - expenses;
  const lastBal  = tx.find(t => t.balance > 0)?.balance || 0;

  // KPI cards
  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Total Income</div>
      <div class="kpi-value green">${fmt(income)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.credit>0).length} credits</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Expenses</div>
      <div class="kpi-value red">${fmt(expenses)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.debit>0).length} debits</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Savings</div>
      <div class="kpi-value ${net>=0?'blue':'red'}">${net>=0?'+':''}${fmt(net)}</div>
      <div class="kpi-sub">income − expenses</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Closing Balance</div>
      <div class="kpi-value gold">${lastBal ? fmt(lastBal) : '—'}</div>
      <div class="kpi-sub">most recent balance</div>
    </div>
  `;

  renderCashflowChart(tx);
  renderDonutChart(tx);
  renderBarChart(tx);
}

function renderCashflowChart(tx) {
  const byMonth = {};
  tx.forEach(t => {
    if (!byMonth[t.monthKey]) byMonth[t.monthKey] = { income:0, expense:0, label:t.month };
    byMonth[t.monthKey].income  += t.credit;
    byMonth[t.monthKey].expense += t.debit;
  });
  const keys = Object.keys(byMonth).sort();
  const labels  = keys.map(k => byMonth[k].label);
  const income  = keys.map(k => byMonth[k].income);
  const expense = keys.map(k => byMonth[k].expense);

  const ctx = document.getElementById('chart-cashflow').getContext('2d');
  if (State.charts.cashflow) State.charts.cashflow.destroy();
  State.charts.cashflow = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Income',   data: income,  backgroundColor:'rgba(74,222,128,0.7)',  borderRadius:4 },
        { label:'Expenses', data: expense, backgroundColor:'rgba(248,113,113,0.7)', borderRadius:4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend:{ labels:{ color:'#94A3B8', font:{size:11} } } },
      scales: {
        x: { ticks:{ color:'#64748B', font:{size:11} }, grid:{ color:'rgba(255,255,255,0.05)' } },
        y: { ticks:{ color:'#64748B', font:{size:11}, callback:v=>'€'+v.toLocaleString() }, grid:{ color:'rgba(255,255,255,0.05)' } },
      }
    }
  });
}

function renderDonutChart(tx) {
  const expenseTx = tx.filter(t => t.debit > 0 &&
    !['Salary','Investment Returns','Credits / Refunds','Internal Transfer'].includes(t.category));

  const byCat = {};
  expenseTx.forEach(t => { byCat[t.category] = (byCat[t.category]||0) + t.debit; });
  const sorted = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,10);

  const ctx = document.getElementById('chart-donut').getContext('2d');
  if (State.charts.donut) State.charts.donut.destroy();
  State.charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(e=>e[0]),
      datasets: [{ data: sorted.map(e=>e[1]),
        backgroundColor: sorted.map(e => getCatStyle(e[0]).accent + 'CC'),
        borderColor: '#1B2A4A', borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position:'right', labels:{ color:'#94A3B8', font:{size:10}, boxWidth:12, padding:6 } },
        tooltip: { callbacks:{ label: ctx => ` ${ctx.label}: €${ctx.raw.toLocaleString('en',{minimumFractionDigits:2})}` } }
      },
      cutout: '65%',
    }
  });
}

function renderBarChart(tx) {
  const expenseTx = tx.filter(t => t.debit > 0 &&
    !['Salary','Investment Returns','Credits / Refunds','Internal Transfer'].includes(t.category));
  const byCat = {};
  expenseTx.forEach(t => { byCat[t.category] = (byCat[t.category]||0) + t.debit; });
  const sorted = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,12);

  const ctx = document.getElementById('chart-bar').getContext('2d');
  if (State.charts.bar) State.charts.bar.destroy();
  State.charts.bar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(e=>e[0]),
      datasets: [{ label:'Amount (€)', data: sorted.map(e=>e[1]),
        backgroundColor: sorted.map(e => getCatStyle(e[0]).accent + 'CC'),
        borderRadius: 5 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display:false },
        tooltip: { callbacks:{ label: ctx=>`€${ctx.raw.toLocaleString('en',{minimumFractionDigits:2})}` } },
      },
      scales: {
        x: { ticks:{ color:'#64748B', font:{size:11}, callback:v=>'€'+v.toLocaleString() }, grid:{ color:'rgba(255,255,255,0.05)' } },
        y: { ticks:{ color:'#94A3B8', font:{size:11} }, grid:{ display:false } },
      }
    }
  });
}

// ── Transactions view ────────────────────────────────────────
function renderTransactions() {
  applyFilters();
  const tx = [...State.filteredTx].sort((a,b) => {
    const dir = State.sortDir === 'asc' ? 1 : -1;
    if (State.sortCol === 'date')     return dir * (a.date - b.date);
    if (State.sortCol === 'debit')    return dir * (a.debit - b.debit);
    if (State.sortCol === 'credit')   return dir * (a.credit - b.credit);
    if (State.sortCol === 'balance')  return dir * (a.balance - b.balance);
    if (State.sortCol === 'merchant') return dir * a.merchant.localeCompare(b.merchant);
    if (State.sortCol === 'category') return dir * a.category.localeCompare(b.category);
    return 0;
  });

  document.getElementById('row-count').textContent = `${tx.length} transactions`;

  const tbody = document.getElementById('tx-body');
  tbody.innerHTML = '';
  tx.forEach(t => {
    const st = getCatStyle(t.category);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
      <td><span class="cat-badge" style="background:${st.bg};color:${st.fg}">${t.category}</span></td>
      <td class="${t.debit>0?'debit-cell':'num'}">${t.debit>0?fmt(t.debit):'—'}</td>
      <td class="${t.credit>0?'credit-cell':'num'}">${t.credit>0?fmt(t.credit):'—'}</td>
      <td class="balance-cell">${t.balance>0?fmt(t.balance):'—'}</td>
    `;
    // Link to source file
    tr.title = `Source: ${t.sourceFile}  |  ${t.desc}`;
    tbody.appendChild(tr);
  });
}

// Sort headers
document.querySelectorAll('#tx-table thead th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (State.sortCol === col) State.sortDir = State.sortDir === 'asc' ? 'desc' : 'asc';
    else { State.sortCol = col; State.sortDir = 'desc'; }
    document.querySelectorAll('#tx-table thead th .sort-icon').forEach(s => s.textContent = '↕');
    th.querySelector('.sort-icon').textContent = State.sortDir === 'asc' ? '↑' : '↓';
    renderTransactions();
  });
});

// ── Categories view ──────────────────────────────────────────
function renderCategories() {
  const tx = getTx().filter(t => t.debit > 0);
  const byCat = {};
  tx.forEach(t => {
    if (!byCat[t.category]) byCat[t.category] = { total:0, count:0, items:[] };
    byCat[t.category].total += t.debit;
    byCat[t.category].count++;
    byCat[t.category].items.push(t);
  });

  const totalExp = tx.reduce((s,t) => s+t.debit, 0);
  const sorted = Object.entries(byCat).sort((a,b) => b[1].total - a[1].total);

  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  document.getElementById('cat-detail').classList.add('hidden');
  grid.classList.remove('hidden');

  sorted.forEach(([cat, data]) => {
    const st = getCatStyle(cat);
    const pct = totalExp > 0 ? (data.total / totalExp * 100).toFixed(1) : 0;
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.setProperty('--accent-color', st.accent);
    card.innerHTML = `
      <div class="cat-card-name" style="color:${st.accent}">${cat}</div>
      <div class="cat-card-amount" style="color:${st.accent}">${fmt(data.total)}</div>
      <div class="cat-card-meta">${data.count} transactions · ${pct}% of expenses</div>
    `;
    card.addEventListener('click', () => showCatDetail(cat, data.items, st));
    grid.appendChild(card);
  });
}

function showCatDetail(cat, items, st) {
  document.getElementById('cat-grid').classList.add('hidden');
  const detail = document.getElementById('cat-detail');
  detail.classList.remove('hidden');
  document.getElementById('cat-detail-title').textContent = cat;
  document.getElementById('cat-detail-title').style.color = st.accent;

  const tbody = document.getElementById('cat-body');
  tbody.innerHTML = '';
  items.sort((a,b) => b.date - a.date).forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
      <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
      <td class="debit-cell">${t.debit>0?fmt(t.debit):'—'}</td>
      <td class="credit-cell">${t.credit>0?fmt(t.credit):'—'}</td>
    `;
    tr.title = `Source: ${t.sourceFile}`;
    tbody.appendChild(tr);
  });
}

document.getElementById('cat-back').addEventListener('click', () => {
  document.getElementById('cat-detail').classList.add('hidden');
  document.getElementById('cat-grid').classList.remove('hidden');
});

// ── Monthly view ─────────────────────────────────────────────
function renderMonthly() {
  const byMonth = {};
  State.allTx.forEach(t => {
    const k = t.monthKey;
    if (!byMonth[k]) byMonth[k] = { label:t.month, income:0, expense:0, txCount:0 };
    byMonth[k].income   += t.credit;
    byMonth[k].expense  += t.debit;
    byMonth[k].txCount++;
  });

  const keys = Object.keys(byMonth).sort().reverse();
  const grid = document.getElementById('monthly-grid');
  grid.innerHTML = '';

  keys.forEach(k => {
    const m = byMonth[k];
    const net = m.income - m.expense;
    const card = document.createElement('div');
    card.className = 'month-card';
    card.innerHTML = `
      <div class="month-card-header">
        <span class="month-card-title">${m.label}</span>
        <span style="font-family:var(--font-mono);font-size:13px;color:${net>=0?'#4ADE80':'#F87171'}">${net>=0?'+':''}${fmt(net)}</span>
      </div>
      <div class="month-card-rows">
        <div class="month-row"><span class="month-row-label">Income</span><span class="month-row-val" style="color:#4ADE80">${fmt(m.income)}</span></div>
        <div class="month-row"><span class="month-row-label">Expenses</span><span class="month-row-val" style="color:#F87171">${fmt(m.expense)}</span></div>
        <div class="month-row"><span class="month-row-label">Transactions</span><span class="month-row-val">${m.txCount}</span></div>
      </div>
    `;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      // Switch to transactions filtered by this month
      State.currentMonth = k;
      document.querySelectorAll('.month-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.month === k);
      });
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelector('[data-view="transactions"]').classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
      document.getElementById('view-transactions').classList.remove('hidden');
      document.getElementById('page-title').textContent = 'Transactions';
      applyFilters();
      renderTransactions();
    });
    grid.appendChild(card);
  });
}

// ── Init ─────────────────────────────────────────────────────
function init() {
  loadYear(CONFIG.defaultYear);
}
