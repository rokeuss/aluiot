// ═══════════════════════════════════════════════════════════
//  NIM BANK DASHBOARD  — app.js
// ═══════════════════════════════════════════════════════════

const State = {
  allTx: [],
  filteredTx: [],
  currentYear: CONFIG.defaultYear,
  currentMonth: 'all',
  sortCol: 'date',
  sortDir: 'desc',
  charts: {},
  catDrillCat: null,
  catDrillMonth: null,
};

// ── Category rules ─────────────────────────────────────────
const CAT_RULES = [
  { cat:'Salary',             icon:'💼', test:(d)=>/GLOBE INVEST|SALARY/i.test(d) },
  { cat:'Investment Returns', icon:'📈', test:(d,t)=>/INTERACTIVE BROKERS|1BANK/i.test(d)||(/BOC TRANSFER/i.test(t)&&/CREDIT/i.test(t)) },
  { cat:'Credits / Refunds',  icon:'↩️', test:(d,t)=>/CREDIT VOUCH/i.test(d)||/OTHER CREDIT/i.test(t) },
  { cat:'Bank Fees',          icon:'🏦', test:(d,t)=>/IBU.MAINTENANCE|MAINTENANCE FEE/i.test(d)||/COMMISSION.*FEE/i.test(t) },
  { cat:'Groceries',          icon:'🛒', test:(d)=>/SKLAVENITIS|ALPHAMEGA|METRO SUPER|ORANGE FRUIT|STEASA FRUIT|MARATHASA/i.test(d) },
  { cat:'Dining & Food',      icon:'🍽️', test:(d)=>/WOLT|WOOD N.FIRE|PAUL CAFE|NEOCONVENIENCE|SO EASY|THREE F|COFFEE HOUSE|E-PAYMENTS/i.test(d) },
  { cat:'Sports & Fitness',   icon:'🏃', test:(d)=>/PLAYTOMIC|FUTSAL|PADELPRO|THEPADEL|RACKET|G\.C\. SPORTS/i.test(d) },
  { cat:'Subscriptions',      icon:'📱', test:(d)=>/NETFLIX|SPOTIFY|GOOGLE ONE|YOUTUBE|TRADINGVIEW|CLAUDE\.AI|CHATGPT|OPENAI|AWSEMEA|ROBLOX/i.test(d) },
  { cat:'Trading Tools',      icon:'📊', test:(d)=>/TRADEIFY|BULENOX|TAKEPROFITT|BWOOST/i.test(d) },
  { cat:'Fuel',               icon:'⛽', test:(d)=>/ESSO|RAMOIL/i.test(d) },
  { cat:'Home & Hardware',    icon:'🏠', test:(d)=>/IKEA|LEROY MERLIN|SUPERHOME|BIONIC|VICAN|FOUR DAY CLEARANCE|AYKCO|STEPHANIS|SOLONION/i.test(d) },
  { cat:'Security (CCTV)',    icon:'🔒', test:(d)=>/CCTV|CHRISONS/i.test(d) },
  { cat:'Utilities & Bills',  icon:'💡', test:(d)=>/CYTA|CABLENET|WATER BOARD|EOANICOSIA|SOCIAL INSURANCE/i.test(d) },
  { cat:'Travel & Transport', icon:'✈️', test:(d)=>/ISRAIR|LARNACA AIRPORT|FACTORY K|THEMOC PARKING|WIZZ/i.test(d) },
  { cat:'Cash Withdrawals',   icon:'💵', test:(d)=>/ATM|CASH WITHDRAWAL|WITHDRAWAL AM 6011|WITHDRAWAL AM 6012/i.test(d) },
  { cat:'Revolut Transfers',  icon:'🔄', test:(d)=>/REVOLUT/i.test(d) },
  { cat:'Shopping & Clothing',icon:'🛍️', test:(d)=>/ZARA|OYSHO|JD SPORTS|BEAUTY BAR|DOTERRA|ANCHORBSHOP|MILAS|DUTY FREE|SKROUTZ|AMZN|AMAZON PRIME|GGLZ6V/i.test(d) },
  { cat:'Education & Family', icon:'📚', test:(d)=>/ELLINOMATHEIA|FEBE APP/i.test(d) },
  { cat:'Internal Transfer',  icon:'🔁', test:(d,t)=>/BOC TRANSFER/i.test(t) },
  { cat:'FX Fees',            icon:'💱', test:(d,t)=>/CARDTXNADMIN|CASH ADV FEE/i.test(d)||/OTHER DEBIT/i.test(t) },
  { cat:'Payments',           icon:'💳', test:(d,t)=>/TIPS/i.test(t) },
];
const INCOME_CATS = new Set(['Salary','Investment Returns','Credits / Refunds','Internal Transfer']);
const CAT_ICON = Object.fromEntries(CAT_RULES.map(r=>[r.cat, r.icon]));

function categorize(desc, txType) {
  for (const r of CAT_RULES) if (r.test(desc||'', txType||'')) return r.cat;
  return 'Other';
}
function cleanMerchant(desc) {
  if (!desc) return '';
  return desc
    .replace(/\s+PURCHASE\s+.*/i,'')
    .replace(/INWARD\s+\S+\s+by\s+/i,'FROM: ')
    .replace(/CardTxnAdmin\s+/i,'FX Fee: ')
    .replace(/Cash Adv Fee\s+/i,'Cash Fee: ')
    .replace(/^[A-Z]{2}\s+\d{4}\s+/,'')
    .replace(/\s{2,}/g,' ').trim().slice(0,52);
}

// ── Category style palette ──────────────────────────────────
const CAT_STYLE = {
  'Groceries':           {accent:'#10B981'},
  'Home & Hardware':     {accent:'#3B82F6'},
  'Dining & Food':       {accent:'#F59E0B'},
  'Sports & Fitness':    {accent:'#EC4899'},
  'Subscriptions':       {accent:'#8B5CF6'},
  'Trading Tools':       {accent:'#D97706'},
  'Fuel':                {accent:'#EF4444'},
  'Utilities & Bills':   {accent:'#14B8A6'},
  'Travel & Transport':  {accent:'#0EA5E9'},
  'Cash Withdrawals':    {accent:'#64748B'},
  'Shopping & Clothing': {accent:'#A855F7'},
  'Education & Family':  {accent:'#22C55E'},
  'Security (CCTV)':    {accent:'#F97316'},
  'Revolut Transfers':   {accent:'#38BDF8'},
  'Bank Fees':           {accent:'#F87171'},
  'FX Fees':             {accent:'#FBBF24'},
  'Salary':              {accent:'#4ADE80'},
  'Investment Returns':  {accent:'#38BDF8'},
  'Credits / Refunds':   {accent:'#34D399'},
  'Internal Transfer':   {accent:'#94A3B8'},
  'Payments':            {accent:'#FB923C'},
  'Other':               {accent:'#94A3B8'},
};
function catAccent(cat) { return (CAT_STYLE[cat]||CAT_STYLE['Other']).accent; }

// ── Number formatter ────────────────────────────────────────
function fmt(n, forceSign=false) {
  if (!n && n !== 0) return '—';
  if (n === 0) return '—';
  const s = '€' + Math.abs(n).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
  if (forceSign && n > 0) return '+' + s;
  return s;
}

// ── CSV Parser ──────────────────────────────────────────────
function parseCSV(csvText, year) {
  const results = Papa.parse(csvText.trim(), {skipEmptyLines:true});
  const rows = results.data;
  const tx = [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i].map(c=>String(c).trim().toLowerCase());
    if (r.includes('date') && (r.includes('debit')||r.includes('credit'))) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return tx;

  const headers = rows[headerIdx].map(c=>String(c).trim().toLowerCase());
  const ci = {
    date:    headers.findIndex(h=>h==='date'),
    desc:    headers.findIndex(h=>h.includes('description')),
    txType:  headers.findIndex(h=>h.includes('transaction_type')||h.includes('transaction type')),
    debit:   headers.findIndex(h=>h==='debit'||h.startsWith('debit')),
    credit:  headers.findIndex(h=>h==='credit'||h.startsWith('credit')),
    balance: headers.findIndex(h=>h.includes('balance')||h.includes('indicative')),
  };

  for (let i = headerIdx+1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = String(row[ci.date]||'').trim();
    if (!rawDate || rawDate.toLowerCase()==='date') continue;
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) continue;

    const desc   = String(row[ci.desc]  ||'').trim();
    const txType = String(row[ci.txType]||'').trim();
    const debit  = parseFloat(row[ci.debit])  || 0;
    const credit = parseFloat(row[ci.credit]) || 0;
    const balance= parseFloat(row[ci.balance])|| 0;
    if (debit===0 && credit===0) continue;

    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
    const wk = getWeekKey(dateObj);

    tx.push({
      id:          `${year}-${i}`,
      csvLine:     i + 1,                    // actual line in CSV (1-indexed, including header)
      sourceFile:  CONFIG.files[year],
      date:        dateObj,
      dateStr:     dateObj.toISOString().slice(0,10),
      month:       dateObj.toLocaleString('en',{month:'short',year:'numeric'}),
      monthKey,
      weekKey:     wk,
      weekLabel:   weekLabel(dateObj),
      desc,
      merchant:    cleanMerchant(desc),
      txType,
      debit,
      credit,
      balance,
      category:    categorize(desc, txType),
      year,
    });
  }
  return tx;
}

function getWeekKey(d) {
  const tmp = new Date(d); tmp.setHours(0,0,0,0);
  tmp.setDate(tmp.getDate() - tmp.getDay() + 1); // Monday
  return tmp.toISOString().slice(0,10);
}
function weekLabel(d) {
  const tmp = new Date(d); tmp.setHours(0,0,0,0);
  const mon = new Date(tmp); mon.setDate(mon.getDate() - mon.getDay() + 1);
  const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  const f = x => x.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  return `${f(mon)} – ${f(sun)}`;
}

// ── Lock screen ─────────────────────────────────────────────
(function(){
  let pin = '';
  const dots = [0,1,2,3].map(i=>document.getElementById(`d${i}`));
  const errEl = document.getElementById('lock-error');
  function upd() { dots.forEach((d,i)=>d.classList.toggle('filled',i<pin.length)); }
  document.querySelectorAll('.num-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const n = btn.dataset.n;
      if (n==='clear') pin=pin.slice(0,-1);
      else if (n==='ok') { check(); return; }
      else if (pin.length<4) pin+=n;
      upd(); if (pin.length===4) setTimeout(check,150);
    });
  });
  document.addEventListener('keydown',e=>{
    if (document.getElementById('lock-screen').classList.contains('hidden')) return;
    if (e.key>='0'&&e.key<='9'&&pin.length<4){pin+=e.key;upd();if(pin.length===4)setTimeout(check,150);}
    if (e.key==='Backspace'){pin=pin.slice(0,-1);upd();}
    if (e.key==='Enter') check();
  });
  function check(){
    if (pin===CONFIG.PIN){
      document.getElementById('lock-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      init();
    } else {
      errEl.textContent='Incorrect PIN. Try again.';
      pin=''; upd();
      setTimeout(()=>errEl.textContent='',2000);
    }
  }
})();

// ── Navigation ───────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(el=>{
  el.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    el.classList.add('active');
    const view = el.dataset.view;
    showView(view);
    setBreadcrumb([el.textContent.trim()]);
    if (window.innerWidth<=900) document.getElementById('sidebar').classList.remove('open');
  });
});

function showView(view) {
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  if (view==='dashboard')    renderDashboard();
  if (view==='yearly')       renderYearly();
  if (view==='monthly')      renderMonthly();
  if (view==='weekly')       renderWeekly();
  if (view==='categories')   renderCategories();
  if (view==='transactions') renderTransactions();
}

function setBreadcrumb(parts) {
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = parts.map((p,i)=>
    `<span class="bc-item ${i===parts.length-1?'active':''}">${p}</span>`
  ).join('<span class="bc-sep">›</span>');
}

document.getElementById('menu-toggle').addEventListener('click',()=>{
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Year selector ────────────────────────────────────────────
const yearSelect = document.getElementById('year-select');
Object.keys(CONFIG.files).sort((a,b)=>b-a).forEach(y=>{
  const opt = document.createElement('option');
  opt.value=y; opt.textContent=y;
  if (y===CONFIG.defaultYear) opt.selected=true;
  yearSelect.appendChild(opt);
});
yearSelect.addEventListener('change',()=>{
  State.currentYear = yearSelect.value;
  State.currentMonth = 'all';
  loadYear(State.currentYear);
});

// ── Search ───────────────────────────────────────────────────
let searchTimer;
document.getElementById('search-input').addEventListener('input',()=>{
  clearTimeout(searchTimer);
  searchTimer = setTimeout(()=>{ applyFilters(); renderTransactions(); }, 200);
});
['filter-type','filter-cat','filter-month'].forEach(id=>{
  document.getElementById(id).addEventListener('change',()=>{ applyFilters(); renderTransactions(); });
});

// ── Load data ────────────────────────────────────────────────
function loadYear(year) {
  const url = CONFIG.files[year];
  if (!url) return;
  document.getElementById('loading-overlay').classList.remove('hidden');
  fetch(url+'?t='+Date.now())
    .then(r=>{ if(!r.ok) throw new Error(r.status); return r.text(); })
    .then(text=>{
      State.allTx = parseCSV(text, year);
      State.filteredTx = [...State.allTx];
      buildMonthPills();
      buildFilters();
      renderDashboard();
      document.getElementById('last-updated').textContent =
        `${State.allTx.length} tx · ${year}`;
    })
    .catch(err=>{
      console.error(err);
      document.getElementById('last-updated').textContent = 'Load error';
    })
    .finally(()=>document.getElementById('loading-overlay').classList.add('hidden'));
}

function buildMonthPills() {
  const months = [...new Set(State.allTx.map(t=>t.monthKey))].sort().reverse();
  const c = document.getElementById('month-pills');
  c.innerHTML = '';
  const all = mkPill('All','all',true); c.appendChild(all);
  months.forEach(mk=>{
    const tx0 = State.allTx.find(t=>t.monthKey===mk);
    c.appendChild(mkPill(tx0?.month||mk, mk, false));
  });
  c.querySelectorAll('.month-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      c.querySelectorAll('.month-pill').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      State.currentMonth = btn.dataset.month;
      applyFilters();
      renderDashboard();
    });
  });
}
function mkPill(label, mk, active) {
  const b = document.createElement('button');
  b.className = 'month-pill'+(active?' active':'');
  b.textContent = label; b.dataset.month = mk;
  return b;
}

function buildFilters() {
  const cats = [...new Set(State.allTx.map(t=>t.category))].sort();
  const selC = document.getElementById('filter-cat');
  selC.innerHTML = '<option value="">All Categories</option>';
  cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; selC.appendChild(o); });

  const months = [...new Set(State.allTx.map(t=>t.monthKey))].sort().reverse();
  const selM = document.getElementById('filter-month');
  selM.innerHTML = '<option value="">All Months</option>';
  months.forEach(mk=>{
    const tx0 = State.allTx.find(t=>t.monthKey===mk);
    const o = document.createElement('option'); o.value=mk; o.textContent=tx0?.month||mk; selM.appendChild(o);
  });
}

function applyFilters() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const type   = document.getElementById('filter-type').value;
  const cat    = document.getElementById('filter-cat').value;
  const month  = document.getElementById('filter-month').value || State.currentMonth;
  State.filteredTx = State.allTx.filter(t=>{
    if (month!=='all' && t.monthKey!==month) return false;
    if (type==='debit'  && t.debit===0)  return false;
    if (type==='credit' && t.credit===0) return false;
    if (cat && t.category!==cat) return false;
    if (search && !t.merchant.toLowerCase().includes(search) &&
        !t.desc.toLowerCase().includes(search) &&
        !t.category.toLowerCase().includes(search)) return false;
    return true;
  });
}

// ── helpers ──────────────────────────────────────────────────
function getTx() {
  if (State.currentMonth==='all') return State.allTx;
  return State.allTx.filter(t=>t.monthKey===State.currentMonth);
}
function groupBy(arr, key) {
  return arr.reduce((m,t)=>{ (m[t[key]]||(m[t[key]]=[])).push(t); return m; }, {});
}
function sumDebit(arr) { return arr.reduce((s,t)=>s+t.debit,0); }
function sumCredit(arr) { return arr.reduce((s,t)=>s+t.credit,0); }

function sourceLink(tx) {
  return `<a class="source-link" href="${tx.sourceFile}" target="_blank" title="${tx.desc}">📄 Line ${tx.csvLine}</a>`;
}

function catBadge(cat) {
  const acc = catAccent(cat);
  return `<span class="cat-badge" style="background:${acc}22;color:${acc}">${cat}</span>`;
}

// ── DASHBOARD ────────────────────────────────────────────────
function renderDashboard() {
  const tx = getTx();
  const income   = sumCredit(tx);
  const expenses = sumDebit(tx);
  const net      = income - expenses;
  const lastBal  = tx.find(t=>t.balance>0)?.balance||0;

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total Income</div>
      <div class="kpi-value green">${fmt(income)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.credit>0).length} credits</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Expenses</div>
      <div class="kpi-value red">${fmt(expenses)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.debit>0).length} debits</div></div>
    <div class="kpi-card"><div class="kpi-label">Net Savings</div>
      <div class="kpi-value ${net>=0?'blue':'red'}">${net>=0?'+':''}${fmt(net)}</div>
      <div class="kpi-sub">income − expenses</div></div>
    <div class="kpi-card"><div class="kpi-label">Closing Balance</div>
      <div class="kpi-value gold">${lastBal?fmt(lastBal):'—'}</div>
      <div class="kpi-sub">most recent</div></div>
  `;
  renderCashflowChart(tx);
  renderDonutChart(tx);
  renderBarChart(tx);
}

function renderCashflowChart(tx) {
  const byM = {};
  tx.forEach(t=>{ if(!byM[t.monthKey]) byM[t.monthKey]={i:0,e:0,lbl:t.month}; byM[t.monthKey].i+=t.credit; byM[t.monthKey].e+=t.debit; });
  const keys = Object.keys(byM).sort();
  const ctx = document.getElementById('chart-cashflow').getContext('2d');
  if (State.charts.cashflow) State.charts.cashflow.destroy();
  State.charts.cashflow = new Chart(ctx, {
    type:'bar',
    data:{ labels:keys.map(k=>byM[k].lbl),
      datasets:[
        {label:'Income',   data:keys.map(k=>byM[k].i), backgroundColor:'rgba(74,222,128,.7)',  borderRadius:4},
        {label:'Expenses', data:keys.map(k=>byM[k].e), backgroundColor:'rgba(248,113,113,.7)', borderRadius:4},
      ]},
    options: chartOpts('bar')
  });
}

function renderDonutChart(tx) {
  const exp = tx.filter(t=>t.debit>0 && !INCOME_CATS.has(t.category));
  const byCat = {}; exp.forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.debit; });
  const sorted = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const ctx = document.getElementById('chart-donut').getContext('2d');
  if (State.charts.donut) State.charts.donut.destroy();
  State.charts.donut = new Chart(ctx,{
    type:'doughnut',
    data:{labels:sorted.map(e=>e[0]),datasets:[{data:sorted.map(e=>e[1]),
      backgroundColor:sorted.map(e=>catAccent(e[0])+'CC'),
      borderColor:'#1B2A4A',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'65%',
      plugins:{legend:{position:'right',labels:{color:'#94A3B8',font:{size:10},boxWidth:12,padding:5}},
        tooltip:{callbacks:{label:ctx=>`${ctx.label}: €${ctx.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}}}
  });
}

function renderBarChart(tx) {
  const exp = tx.filter(t=>t.debit>0 && !INCOME_CATS.has(t.category));
  const byCat = {}; exp.forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.debit; });
  const sorted = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const ctx = document.getElementById('chart-bar').getContext('2d');
  if (State.charts.bar) State.charts.bar.destroy();
  State.charts.bar = new Chart(ctx,{
    type:'bar',
    data:{labels:sorted.map(e=>e[0]),datasets:[{label:'€',data:sorted.map(e=>e[1]),
      backgroundColor:sorted.map(e=>catAccent(e[0])+'CC'),borderRadius:5}]},
    options:{...chartOpts('hbar'), indexAxis:'y'}
  });
}

function chartOpts(type) {
  return {
    responsive:true, maintainAspectRatio:true,
    plugins:{legend:{labels:{color:'#94A3B8',font:{size:11}}},
      tooltip:{callbacks:{label:ctx=>`€${ctx.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
    scales:{
      x:{ticks:{color:'#64748B',font:{size:11},callback:v=>type==='hbar'?`€${v.toLocaleString()}`:v},grid:{color:'rgba(255,255,255,.05)'}},
      y:{ticks:{color:'#64748B',font:{size:11},callback:v=>type==='bar'?`€${v.toLocaleString()}`:v},grid:{color:type==='hbar'?'transparent':'rgba(255,255,255,.05)'}},
    }
  };
}

// ── YEARLY OVERVIEW ──────────────────────────────────────────
function renderYearly() {
  const tx = State.allTx;
  if (!tx.length) return;
  const income   = sumCredit(tx);
  const expenses = sumDebit(tx);
  const net      = income - expenses;
  const txCount  = tx.length;

  document.getElementById('yearly-kpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total Income ${State.currentYear}</div><div class="kpi-value green">${fmt(income)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Expenses ${State.currentYear}</div><div class="kpi-value red">${fmt(expenses)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Net Savings</div><div class="kpi-value ${net>=0?'blue':'red'}">${fmt(net,true)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Transactions</div><div class="kpi-value gold">${txCount}</div><div class="kpi-sub">total entries</div></div>
  `;

  // Monthly expenses chart
  const byM = {};
  tx.forEach(t=>{ if(!byM[t.monthKey]) byM[t.monthKey]={e:0,i:0,lbl:t.month}; byM[t.monthKey].e+=t.debit; byM[t.monthKey].i+=t.credit; });
  const keys = Object.keys(byM).sort();

  const ctx1 = document.getElementById('chart-yearly-monthly').getContext('2d');
  if (State.charts.yrMonthly) State.charts.yrMonthly.destroy();
  State.charts.yrMonthly = new Chart(ctx1,{
    type:'bar',
    data:{labels:keys.map(k=>byM[k].lbl),
      datasets:[{label:'Expenses',data:keys.map(k=>byM[k].e),backgroundColor:'rgba(248,113,113,.7)',borderRadius:4}]},
    options:chartOpts('bar')
  });

  // Income vs Expenses radar/bar
  const ctx2 = document.getElementById('chart-yearly-ie').getContext('2d');
  if (State.charts.yrIE) State.charts.yrIE.destroy();
  State.charts.yrIE = new Chart(ctx2,{
    type:'bar',
    data:{labels:keys.map(k=>byM[k].lbl),
      datasets:[
        {label:'Income',  data:keys.map(k=>byM[k].i),backgroundColor:'rgba(74,222,128,.6)',borderRadius:4},
        {label:'Expenses',data:keys.map(k=>byM[k].e),backgroundColor:'rgba(248,113,113,.6)',borderRadius:4},
      ]},
    options:{...chartOpts('bar'),plugins:{legend:{labels:{color:'#94A3B8',font:{size:11}}}}}
  });

  // Yearly category breakdown
  const expTx = tx.filter(t=>t.debit>0 && !INCOME_CATS.has(t.category));
  const byCat = {}; expTx.forEach(t=>{ byCat[t.category]=(byCat[t.category]||0)+t.debit; });
  const catSorted = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const ctx3 = document.getElementById('chart-yearly-cats').getContext('2d');
  if (State.charts.yrCats) State.charts.yrCats.destroy();
  State.charts.yrCats = new Chart(ctx3,{
    type:'bar',
    data:{labels:catSorted.map(e=>e[0]),datasets:[{label:'Total €',data:catSorted.map(e=>e[1]),
      backgroundColor:catSorted.map(e=>catAccent(e[0])+'CC'),borderRadius:5}]},
    options:{...chartOpts('hbar'),indexAxis:'y',plugins:{legend:{display:false}}}
  });

  // Month cards
  const grid = document.getElementById('yearly-months-grid');
  grid.innerHTML = '';
  keys.reverse().forEach(mk=>{
    const m = byM[mk];
    const netM = m.i - m.e;
    const card = document.createElement('div');
    card.className = 'year-month-card';
    card.innerHTML = `
      <div class="year-month-title">${m.lbl}</div>
      <div class="year-month-row"><span class="year-month-label">Income</span><span class="year-month-val" style="color:#4ADE80">${fmt(m.i)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Expenses</span><span class="year-month-val" style="color:#F87171">${fmt(m.e)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Net</span><span class="year-month-val" style="color:${netM>=0?'#60A5FA':'#F87171'}">${fmt(netM,true)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Transactions</span><span class="year-month-val">${tx.filter(t=>t.monthKey===mk).length}</span></div>
    `;
    card.addEventListener('click',()=>{
      State.currentMonth = mk;
      document.querySelectorAll('.month-pill').forEach(p=>p.classList.toggle('active',p.dataset.month===mk));
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      document.querySelector('[data-view="monthly"]').classList.add('active');
      showView('monthly');
      setBreadcrumb(['Monthly',m.lbl]);
    });
    grid.appendChild(card);
  });
}

// ── MONTHLY VIEW ─────────────────────────────────────────────
function renderMonthly() {
  const byM = groupBy(State.allTx, 'monthKey');
  const keys = Object.keys(byM).sort().reverse();
  const container = document.getElementById('monthly-list');
  container.innerHTML = '';

  keys.forEach(mk=>{
    const txs = byM[mk].sort((a,b)=>b.date-a.date);
    const income   = sumCredit(txs);
    const expenses = sumDebit(txs);
    const net      = income - expenses;
    const lbl      = txs[0].month;

    const sec = document.createElement('div');
    sec.className = 'monthly-section';

    const header = document.createElement('div');
    header.className = 'monthly-section-header';
    header.innerHTML = `
      <span class="monthly-section-title">${lbl}</span>
      <div class="monthly-section-stats">
        <div class="monthly-stat"><div class="monthly-stat-label">Income</div><div class="monthly-stat-val" style="color:#4ADE80">${fmt(income)}</div></div>
        <div class="monthly-stat"><div class="monthly-stat-label">Expenses</div><div class="monthly-stat-val" style="color:#F87171">${fmt(expenses)}</div></div>
        <div class="monthly-stat"><div class="monthly-stat-label">Net</div><div class="monthly-stat-val" style="color:${net>=0?'#60A5FA':'#F87171'}">${fmt(net,true)}</div></div>
        <div class="monthly-stat"><div class="monthly-stat-label">Txns</div><div class="monthly-stat-val">${txs.length}</div></div>
      </div>
    `;

    const body = document.createElement('div');
    body.className = 'monthly-section-body';
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';
    tableWrap.innerHTML = `
      <table>
        <thead><tr>
          <th>Date</th><th>Merchant</th><th>Category</th>
          <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th><th>Line</th>
        </tr></thead>
        <tbody>${txs.map(t=>`
          <tr>
            <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
            <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
            <td>${catBadge(t.category)}</td>
            <td class="${t.debit>0?'debit-cell':'num'}">${t.debit>0?fmt(t.debit):'—'}</td>
            <td class="${t.credit>0?'credit-cell':'num'}">${t.credit>0?fmt(t.credit):'—'}</td>
            <td class="balance-cell">${t.balance>0?fmt(t.balance):'—'}</td>
            <td class="line-cell">${sourceLink(t)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    body.appendChild(tableWrap);

    // Toggle body on header click
    let open = mk === Object.keys(byM).sort().reverse()[0]; // latest open by default
    body.style.display = open ? '' : 'none';
    header.addEventListener('click',()=>{ open=!open; body.style.display=open?'':'none'; });

    sec.appendChild(header);
    sec.appendChild(body);
    container.appendChild(sec);
  });
}

// ── WEEKLY VIEW ──────────────────────────────────────────────
function renderWeekly() {
  const expTx = State.allTx.filter(t=>t.debit>0 && !INCOME_CATS.has(t.category));
  const byW = groupBy(expTx, 'weekKey');
  const wkeys = Object.keys(byW).sort().reverse();

  // Chart
  const chartKeys = [...wkeys].reverse().slice(-16); // last 16 weeks
  const ctx = document.getElementById('chart-weekly').getContext('2d');
  if (State.charts.weekly) State.charts.weekly.destroy();
  State.charts.weekly = new Chart(ctx,{
    type:'bar',
    data:{
      labels: chartKeys.map(k=>byW[k][0].weekLabel.split('–')[0].trim()),
      datasets:[{label:'Expenses',data:chartKeys.map(k=>sumDebit(byW[k])),
        backgroundColor:'rgba(248,113,113,.7)',borderRadius:4}]
    },
    options:chartOpts('bar')
  });

  // Sections
  const container = document.getElementById('weekly-list');
  container.innerHTML = '';
  wkeys.forEach(wk=>{
    const txs = byW[wk].sort((a,b)=>b.date-a.date);
    const total = sumDebit(txs);
    const sec = document.createElement('div');
    sec.className = 'weekly-section';
    sec.innerHTML = `
      <div class="weekly-header">
        <span class="weekly-title">${txs[0].weekLabel}</span>
        <span class="weekly-total">${fmt(total)}</span>
      </div>
      <div class="weekly-body">
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th class="num">Amount</th><th>Line</th></tr></thead>
          <tbody>${txs.map(t=>`
            <tr>
              <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
              <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
              <td>${catBadge(t.category)}</td>
              <td class="debit-cell">${fmt(t.debit)}</td>
              <td class="line-cell">${sourceLink(t)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
    container.appendChild(sec);
  });
}

// ── CATEGORIES — 3-level drill-down ─────────────────────────
function renderCategories() {
  // Reset to level 0
  document.getElementById('cat-level-0').classList.remove('hidden');
  document.getElementById('cat-level-1').classList.add('hidden');
  document.getElementById('cat-level-2').classList.add('hidden');

  const expTx = State.allTx.filter(t=>t.debit>0 && !INCOME_CATS.has(t.category));
  const totalExp = sumDebit(expTx);
  const byCat = groupBy(expTx, 'category');
  const sorted = Object.entries(byCat).sort((a,b)=>sumDebit(b[1])-sumDebit(a[1]));
  const maxAmt = sumDebit(sorted[0]?.[1]||[]);

  // Summary bar
  document.getElementById('cat-summary-bar').innerHTML = `
    <div class="cat-summary-stat"><div class="label">Total Expenses</div><div class="val" style="color:#F87171">${fmt(totalExp)}</div></div>
    <div class="cat-summary-stat"><div class="label">Categories</div><div class="val" style="color:#60A5FA">${sorted.length}</div></div>
    <div class="cat-summary-stat"><div class="label">Transactions</div><div class="val">${expTx.length}</div></div>
  `;

  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  sorted.forEach(([cat, txs])=>{
    const total = sumDebit(txs);
    const pct   = totalExp>0 ? (total/totalExp*100).toFixed(1) : 0;
    const acc   = catAccent(cat);
    const icon  = CAT_ICON[cat]||'💰';
    const card  = document.createElement('div');
    card.className = 'cat-card';
    card.style.setProperty('--accent-color', acc);
    card.innerHTML = `
      <div class="cat-card-emoji">${icon}</div>
      <div class="cat-card-name" style="color:${acc}">${cat}</div>
      <div class="cat-card-amount" style="color:${acc}">${fmt(total)}</div>
      <div class="cat-card-meta">${txs.length} transactions · ${pct}%</div>
      <div class="cat-card-bar"><div class="cat-card-bar-fill" style="width:${(total/maxAmt*100).toFixed(1)}%;background:${acc}"></div></div>
    `;
    card.addEventListener('click',()=>showCatLevel1(cat, txs));
    grid.appendChild(card);
  });

  setBreadcrumb(['Categories']);
}

function showCatLevel1(cat, txs) {
  State.catDrillCat = cat;
  document.getElementById('cat-level-0').classList.add('hidden');
  document.getElementById('cat-level-1').classList.remove('hidden');
  document.getElementById('cat-level-2').classList.add('hidden');

  const acc = catAccent(cat);
  const icon = CAT_ICON[cat]||'💰';
  document.getElementById('cat-l1-title').innerHTML = `<span style="color:${acc}">${icon} ${cat}</span>`;

  // KPIs
  const total = sumDebit(txs);
  const months = [...new Set(txs.map(t=>t.monthKey))];
  const avgMonthly = months.length > 0 ? total/months.length : 0;
  document.getElementById('cat-l1-kpis').innerHTML = `
    <div class="cat-kpi-row"><span class="cat-kpi-label">Total Spent</span><span class="cat-kpi-val" style="color:#F87171">${fmt(total)}</span></div>
    <div class="cat-kpi-row"><span class="cat-kpi-label">Transactions</span><span class="cat-kpi-val">${txs.length}</span></div>
    <div class="cat-kpi-row"><span class="cat-kpi-label">Active Months</span><span class="cat-kpi-val">${months.length}</span></div>
    <div class="cat-kpi-row"><span class="cat-kpi-label">Avg/Month</span><span class="cat-kpi-val">${fmt(avgMonthly)}</span></div>
    <div class="cat-kpi-row"><span class="cat-kpi-label">Largest Tx</span><span class="cat-kpi-val">${fmt(Math.max(...txs.map(t=>t.debit)))}</span></div>
  `;

  // Monthly trend chart
  const byM = groupBy(txs, 'monthKey');
  const mkeys = Object.keys(byM).sort();
  const ctx = document.getElementById('chart-cat-trend').getContext('2d');
  if (State.charts.catTrend) State.charts.catTrend.destroy();
  State.charts.catTrend = new Chart(ctx,{
    type:'bar',
    data:{labels:mkeys.map(k=>byM[k][0].month),
      datasets:[{label:cat,data:mkeys.map(k=>sumDebit(byM[k])),
        backgroundColor:acc+'99',borderColor:acc,borderWidth:1,borderRadius:4}]},
    options:chartOpts('bar')
  });

  // Month blocks
  const blocks = document.getElementById('cat-month-blocks');
  blocks.innerHTML = '';
  const maxMonthTotal = Math.max(...mkeys.map(k=>sumDebit(byM[k])));
  mkeys.reverse().forEach(mk=>{
    const mtx = byM[mk];
    const mTotal = sumDebit(mtx);
    const block = document.createElement('div');
    block.className = 'month-block';
    block.innerHTML = `
      <div class="month-block-header">
        <span class="month-block-name">${mtx[0].month}</span>
        <span class="month-block-total" style="color:${acc}">${fmt(mTotal)}</span>
      </div>
      <div class="month-block-meta">${mtx.length} transactions</div>
      <div class="month-block-bar"><div class="month-block-bar-fill" style="width:${(mTotal/maxMonthTotal*100).toFixed(1)}%;background:${acc}"></div></div>
    `;
    block.addEventListener('click',()=>showCatLevel2(cat, mk, mtx));
    blocks.appendChild(block);
  });

  setBreadcrumb(['Categories', cat]);
}

function showCatLevel2(cat, monthKey, txs) {
  State.catDrillMonth = monthKey;
  document.getElementById('cat-level-1').classList.add('hidden');
  document.getElementById('cat-level-2').classList.remove('hidden');

  const acc = catAccent(cat);
  const icon = CAT_ICON[cat]||'💰';
  const lbl = txs[0].month;
  document.getElementById('cat-l2-title').innerHTML =
    `<span style="color:${acc}">${icon} ${cat}</span> <span style="color:var(--text-2);font-weight:400;font-size:14px">— ${lbl}</span>`;

  const tbody = document.getElementById('cat-tx-body');
  tbody.innerHTML = '';
  txs.sort((a,b)=>b.date-a.date).forEach(t=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="line-cell">${t.csvLine}</td>
      <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
      <td class="desc-cell" title="${t.desc}">${t.desc}</td>
      <td class="${t.debit>0?'debit-cell':'num'}">${t.debit>0?fmt(t.debit):'—'}</td>
      <td class="${t.credit>0?'credit-cell':'num'}">${t.credit>0?fmt(t.credit):'—'}</td>
      <td>${sourceLink(t)}</td>
    `;
    tbody.appendChild(tr);
  });

  setBreadcrumb(['Categories', cat, lbl]);
}

// Back buttons
document.getElementById('cat-back-0').addEventListener('click',()=>catBack(0));
document.getElementById('cat-back-1').addEventListener('click',()=>catBack(1));
window.catBack = function(level) {
  if (level===0) {
    document.getElementById('cat-level-0').classList.remove('hidden');
    document.getElementById('cat-level-1').classList.add('hidden');
    document.getElementById('cat-level-2').classList.add('hidden');
    setBreadcrumb(['Categories']);
  } else if (level===1) {
    document.getElementById('cat-level-1').classList.remove('hidden');
    document.getElementById('cat-level-2').classList.add('hidden');
    setBreadcrumb(['Categories', State.catDrillCat]);
  }
};

// ── ALL TRANSACTIONS ─────────────────────────────────────────
function renderTransactions() {
  applyFilters();
  const tx = [...State.filteredTx].sort((a,b)=>{
    const d = State.sortDir==='asc'?1:-1;
    if (State.sortCol==='date')     return d*(a.date-b.date);
    if (State.sortCol==='debit')    return d*(a.debit-b.debit);
    if (State.sortCol==='credit')   return d*(a.credit-b.credit);
    if (State.sortCol==='balance')  return d*(a.balance-b.balance);
    if (State.sortCol==='merchant') return d*a.merchant.localeCompare(b.merchant);
    if (State.sortCol==='category') return d*a.category.localeCompare(b.category);
    return 0;
  });

  document.getElementById('row-count').textContent = `${tx.length} transactions`;
  const tbody = document.getElementById('tx-body');
  tbody.innerHTML = '';
  tx.forEach(t=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
      <td>${catBadge(t.category)}</td>
      <td class="${t.debit>0?'debit-cell':'num'}">${t.debit>0?fmt(t.debit):'—'}</td>
      <td class="${t.credit>0?'credit-cell':'num'}">${t.credit>0?fmt(t.credit):'—'}</td>
      <td class="balance-cell">${t.balance>0?fmt(t.balance):'—'}</td>
      <td class="line-cell">${sourceLink(t)}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.querySelectorAll('#tx-table thead th[data-sort]').forEach(th=>{
  th.addEventListener('click',()=>{
    const col = th.dataset.sort;
    if (State.sortCol===col) State.sortDir=State.sortDir==='asc'?'desc':'asc';
    else { State.sortCol=col; State.sortDir='desc'; }
    document.querySelectorAll('#tx-table thead th .sort-icon').forEach(s=>s.textContent='↕');
    const si = th.querySelector('.sort-icon');
    if (si) si.textContent = State.sortDir==='asc'?'↑':'↓';
    renderTransactions();
  });
});

// ── Init ─────────────────────────────────────────────────────
function init() { loadYear(CONFIG.defaultYear); }
