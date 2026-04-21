// ════════════════════════════════════════════════════
//  NIM BANK DASHBOARD  —  app.js
// ════════════════════════════════════════════════════

const State = {
  allTx: [], filteredTx: [],
  currentYear: CONFIG.defaultYear,
  currentMonth: 'all',
  sortCol: 'date', sortDir: 'desc',
  charts: {},
  catDrillCat: null,
  catChartMonthFilter: null,
  cfModalOffset: 0,   // months offset for expanded cashflow modal (0 = most recent end)
};

// ── Category rules (ORDER MATTERS — first match wins) ──────
const CAT_RULES = [
  // ── Special / new ──
  { cat:'Housekeeper',      icon:'🏡', test:(d,t,amt)=>/DONNA/i.test(d)||((/BOC TRANSFER/i.test(t)||(/TRANSFER/i.test(d)&&!/TIPS/i.test(t)))&&amt>=620&&amt<=680) },
  { cat:'Social Insurance', icon:'🏛️', test:(d)=>/SOCIAL INSURANCE/i.test(d) },
  // ── Income ──
  { cat:'Salary',             icon:'💼', test:(d)=>/GLOBE INVEST|SALARY/i.test(d) },
  { cat:'Investment Returns', icon:'📈', test:(d,t)=>/INTERACTIVE BROKERS|1BANK/i.test(d) },
  { cat:'Credits / Refunds',  icon:'↩️', test:(d,t)=>/CREDIT VOUCH/i.test(d)||/OTHER CREDIT/i.test(t) },
  // ── Banking ──
  { cat:'Bank Fees',          icon:'🏦', test:(d,t)=>/IBU.MAINTENANCE|MAINTENANCE FEE/i.test(d)||/COMMISSION.*FEE/i.test(t) },
  { cat:'FX Fees',            icon:'💱', test:(d,t)=>/CARDTXNADMIN|CASH ADV FEE/i.test(d)||/OTHER DEBIT/i.test(t) },
  // ── Living ──
  { cat:'Groceries',          icon:'🛒', test:(d)=>/SKLAVENITIS|ALPHAMEGA|METRO SUPER|ORANGE FRUIT|STEASA FRUIT|MARATHASA/i.test(d) },
  { cat:'Dining & Food',      icon:'🍽️', test:(d)=>/WOLT|WOOD N.FIRE|PAUL CAFE|NEOCONVENIENCE|SO EASY|THREE F|COFFEE HOUSE|E-PAYMENTS/i.test(d) },
  { cat:'Fuel',               icon:'⛽', test:(d)=>/ESSO|RAMOIL/i.test(d) },
  { cat:'Utilities & Bills',  icon:'💡', test:(d)=>/CYTA|CABLENET|WATER BOARD|EOANICOSIA/i.test(d) },
  // ── Lifestyle ──
  { cat:'Sports & Fitness',   icon:'🏃', test:(d)=>/PLAYTOMIC|FUTSAL|PADELPRO|THEPADEL|RACKET|G\.C\. SPORTS/i.test(d) },
  { cat:'Subscriptions',      icon:'📱', test:(d)=>/NETFLIX|SPOTIFY|GOOGLE ONE|YOUTUBE|TRADINGVIEW|CLAUDE\.AI|CHATGPT|OPENAI|AWSEMEA|ROBLOX/i.test(d) },
  { cat:'Shopping & Clothing',icon:'🛍️', test:(d)=>/ZARA|OYSHO|JD SPORTS|BEAUTY BAR|DOTERRA|ANCHORBSHOP|MILAS|DUTY FREE|SKROUTZ|AMZN|AMAZON PRIME|GGLZ6V/i.test(d) },
  { cat:'Education & Family', icon:'📚', test:(d)=>/ELLINOMATHEIA|FEBE APP/i.test(d) },
  // ── Home ──
  { cat:'Home & Hardware',    icon:'🏠', test:(d)=>/IKEA|LEROY MERLIN|SUPERHOME|BIONIC|VICAN|FOUR DAY CLEARANCE|AYKCO|STEPHANIS|SOLONION/i.test(d) },
  { cat:'Security (CCTV)',    icon:'🔒', test:(d)=>/CCTV|CHRISONS/i.test(d) },
  // ── Travel ──
  { cat:'Travel & Transport', icon:'✈️', test:(d)=>/ISRAIR|LARNACA AIRPORT|FACTORY K|THEMOC PARKING|WIZZ/i.test(d) },
  { cat:'Cash Withdrawals',   icon:'💵', test:(d)=>/ATM|CASH WITHDRAWAL|WITHDRAWAL AM 6011|WITHDRAWAL AM 6012/i.test(d) },
  // ── Financial ──
  { cat:'Trading Tools',      icon:'📊', test:(d)=>/TRADEIFY|BULENOX|TAKEPROFITT|BWOOST/i.test(d) },
  { cat:'Revolut Transfers',  icon:'🔄', test:(d)=>/REVOLUT/i.test(d) },
  { cat:'Internal Transfer',  icon:'🔁', test:(d,t)=>/BOC TRANSFER/i.test(t) },
  { cat:'Payments',           icon:'💳', test:(d,t)=>/TIPS/i.test(t) },
];
const INCOME_CATS = new Set(['Salary','Investment Returns','Credits / Refunds','Internal Transfer','Housekeeper']);
// Housekeeper is an expense but may show in BOC Transfer — keep it separate from income CATS for expense calcs
const TRUE_INCOME_CATS = new Set(['Salary','Investment Returns','Credits / Refunds']);
const CAT_ICON  = Object.fromEntries(CAT_RULES.map(r=>[r.cat,r.icon]));

function categorize(desc, txType, debit) {
  for (const r of CAT_RULES) if (r.test(desc||'', txType||'', debit||0)) return r.cat;
  return 'Other';
}
function cleanMerchant(desc) {
  if (!desc) return '';
  return desc
    .replace(/\s+PURCHASE\s+.*/i,'').replace(/INWARD\s+\S+\s+by\s+/i,'FROM: ')
    .replace(/CardTxnAdmin\s+/i,'FX Fee: ').replace(/Cash Adv Fee\s+/i,'Cash Fee: ')
    .replace(/^[A-Z]{2}\s+\d{4}\s+/,'').replace(/\s{2,}/g,' ').trim().slice(0,50);
}

const CAT_ACCENT = {
  'Groceries':'#10B981','Home & Hardware':'#3B82F6','Dining & Food':'#F59E0B',
  'Sports & Fitness':'#EC4899','Subscriptions':'#8B5CF6','Trading Tools':'#D97706',
  'Fuel':'#EF4444','Utilities & Bills':'#14B8A6','Travel & Transport':'#0EA5E9',
  'Cash Withdrawals':'#64748B','Shopping & Clothing':'#A855F7','Education & Family':'#22C55E',
  'Security (CCTV)':'#F97316','Revolut Transfers':'#38BDF8','Bank Fees':'#F87171',
  'FX Fees':'#FBBF24','Salary':'#4ADE80','Investment Returns':'#38BDF8',
  'Credits / Refunds':'#34D399','Internal Transfer':'#94A3B8','Payments':'#FB923C',
  'Housekeeper':'#C084FC','Social Insurance':'#34D399','Other':'#94A3B8',
};
const catAccent = c => CAT_ACCENT[c]||'#94A3B8';

function fmt(n, sign=false) {
  if (!n && n!==0) return '—'; if (n===0) return '—';
  const s = '€'+Math.abs(n).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
  return sign&&n>0?'+'+s:s;
}
function fmtShort(n) {
  if (!n) return '—';
  if (Math.abs(n)>=1000) return '€'+(Math.abs(n)/1000).toFixed(1)+'k';
  return '€'+Math.abs(n).toFixed(0);
}

// ── Date parser — handles ISO, European DD/MM/YYYY, and Excel serial numbers ──
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === 'date') return null;

  // ISO: 2026-03-31 or 2026-03-31 03:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0,10));
    return isNaN(d) ? null : d;
  }

  // European: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  // We ALWAYS interpret slashes/dots as DD/MM/YYYY for this Cypriot bank
  const eu = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (eu) {
    const [,day,mon,yr] = eu;
    const d = new Date(`${yr}-${mon.padStart(2,'0')}-${day.padStart(2,'0')}`);
    return isNaN(d) ? null : d;
  }

  // Excel serial date (number only, e.g. 45000)
  if (/^\d{5}$/.test(s)) {
    const d = new Date((parseInt(s) - 25569) * 86400 * 1000);
    return isNaN(d) ? null : d;
  }

  // Last resort — native parse (handles "31 Mar 2026" etc.)
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// ── Number parser — handles "1.234,56" (European) and "1,234.56" (US) ──
function parseNum(raw) {
  if (!raw && raw !== 0) return 0;
  const s = String(raw).trim().replace(/\s/g,'');
  if (!s || s === '-' || s === '') return 0;
  // European: 1.234,56 → remove dots, replace comma with dot
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g,'').replace(',','.')) || 0;
  // US: 1,234.56 → remove commas
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g,'')) || 0;
  return parseFloat(s) || 0;
}

// ── CSV Parser ─────────────────────────────────────────────
function parseCSV(text, year) {
  const rows = Papa.parse(text.trim(),{skipEmptyLines:true}).data;
  const tx=[]; let hi=-1;

  // Scan up to row 15 for the header row containing 'date' and ('debit' or 'credit')
  for(let i=0;i<Math.min(15,rows.length);i++){
    const r=rows[i].map(c=>String(c).trim().toLowerCase());
    if(r.includes('date')&&(r.some(x=>x.startsWith('debit'))||r.some(x=>x.startsWith('credit')))){hi=i;break;}
  }
  if(hi===-1) return tx;

  const h=rows[hi].map(c=>String(c).trim().toLowerCase());
  const ci={
    date:    h.findIndex(x=>x==='date'),
    desc:    h.findIndex(x=>x.includes('description')),
    txType:  h.findIndex(x=>x.includes('transaction_type')||x.includes('transaction type')),
    debit:   h.findIndex(x=>x==='debit'||x.startsWith('debit')),
    credit:  h.findIndex(x=>x==='credit'||x.startsWith('credit')),
    balance: h.findIndex(x=>x.includes('indicative')||x.includes('balance')),
  };

  // Validate we found the critical columns
  if(ci.date===-1||ci.debit===-1) return tx;

  for(let i=hi+1;i<rows.length;i++){
    const row=rows[i];
    const rawDate=String(row[ci.date]||'').trim();

    // Skip footer rows that look like summary lines
    if(!rawDate||/^(total|balance|opening|closing|period)/i.test(rawDate)) continue;

    const dateObj=parseDate(rawDate);
    if(!dateObj) continue;

    // Sanity check: reject future dates beyond current year + 1
    if(dateObj.getFullYear() > new Date().getFullYear() + 1) continue;
    // Reject dates before 2010 (likely parse error)
    if(dateObj.getFullYear() < 2010) continue;

    const desc   = ci.desc>-1   ? String(row[ci.desc]  ||'').trim() : '';
    const txType = ci.txType>-1 ? String(row[ci.txType]||'').trim() : '';
    const debit  = ci.debit>-1  ? parseNum(row[ci.debit])  : 0;
    const credit = ci.credit>-1 ? parseNum(row[ci.credit]) : 0;
    const balance= ci.balance>-1? parseNum(row[ci.balance]): 0;

    if(debit===0&&credit===0) continue;

    const mk=`${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
    const wk=weekStart(dateObj);
    tx.push({
      id:`${year}-${i}`, csvLine:i+1, sourceFile:CONFIG.files[year],
      date:dateObj, dateStr:dateObj.toISOString().slice(0,10),
      month:dateObj.toLocaleString('en',{month:'short',year:'numeric'}),
      monthShort:dateObj.toLocaleString('en',{month:'short'}),
      monthKey:mk, weekKey:wk, weekLabel:weekLbl(dateObj),
      desc, merchant:cleanMerchant(desc), txType,
      debit, credit, balance,
      category:categorize(desc,txType,debit), year,
    });
  }
  return tx;
}
function weekStart(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()-t.getDay()+1);return t.toISOString().slice(0,10);}
function weekLbl(d){const m=new Date(d);m.setDate(m.getDate()-m.getDay()+1);const s=new Date(m);s.setDate(s.getDate()+6);const f=x=>x.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});return`${f(m)} – ${f(s)}`;}

// ── Helpers ────────────────────────────────────────────────
const groupBy=(arr,k)=>arr.reduce((m,t)=>{(m[t[k]]||(m[t[k]]=[])).push(t);return m;},{});
const sumDebit=arr=>arr.reduce((s,t)=>s+t.debit,0);
const sumCredit=arr=>arr.reduce((s,t)=>s+t.credit,0);
function getBudgetTx(){
  if(State.currentMonth==='all') return State.allTx;
  return State.allTx.filter(t=>t.monthKey===State.currentMonth);
}
function sourceLink(t){
  return `<a class="source-link" href="${t.sourceFile}" target="_blank" title="${t.desc}">📄 L${t.csvLine}</a>`;
}
function catBadge(cat){
  const a=catAccent(cat);
  return `<span class="cat-badge" style="background:${a}22;color:${a}">${CAT_ICON[cat]||''} ${cat}</span>`;
}
function chartCfg(){
  return {
    responsive:true,maintainAspectRatio:true,
    plugins:{legend:{labels:{color:'#94A3B8',font:{size:11}}},
      tooltip:{callbacks:{label:c=>`€${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
    scales:{
      x:{ticks:{color:'#64748B',font:{size:11}},grid:{color:'rgba(255,255,255,.04)'}},
      y:{ticks:{color:'#64748B',font:{size:11},callback:v=>`€${v.toLocaleString()}`},grid:{color:'rgba(255,255,255,.04)'}},
    }
  };
}

// ══════════════════════════════════════════════════
// LOCK — with 24-hour localStorage memory
// ══════════════════════════════════════════════════
const AUTH_KEY='nim_auth_ts';
const AUTH_TTL=24*60*60*1000; // 24h

(function(){
  // Check saved session
  const saved=localStorage.getItem(AUTH_KEY);
  if(saved && Date.now()-parseInt(saved)<AUTH_TTL){
    document.getElementById('lock-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    init(); return;
  }

  let pin='';
  const dots=[0,1,2,3].map(i=>document.getElementById(`d${i}`));
  const errEl=document.getElementById('lock-error');
  function upd(){dots.forEach((d,i)=>d.classList.toggle('filled',i<pin.length));}
  document.querySelectorAll('.num-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const n=btn.dataset.n;
      if(n==='clear') pin=pin.slice(0,-1);
      else if(n==='ok'){check();return;}
      else if(pin.length<4) pin+=n;
      upd(); if(pin.length===4) setTimeout(check,150);
    });
  });
  document.addEventListener('keydown',e=>{
    if(!document.getElementById('lock-screen').classList.contains('hidden')){
      if(e.key>='0'&&e.key<='9'&&pin.length<4){pin+=e.key;upd();if(pin.length===4)setTimeout(check,150);}
      if(e.key==='Backspace'){pin=pin.slice(0,-1);upd();}
      if(e.key==='Enter') check();
    }
  });
  function check(){
    if(pin===CONFIG.PIN){
      localStorage.setItem(AUTH_KEY, Date.now().toString());
      document.getElementById('lock-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      init();
    } else {
      errEl.textContent='Incorrect PIN.';
      pin=''; upd();
      setTimeout(()=>errEl.textContent='',2000);
    }
  }
})();

// ══════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(el=>{
  el.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    el.classList.add('active');
    const view=el.dataset.view;
    showView(view);
    setBreadcrumb([el.textContent.trim()]);
    if(window.innerWidth<=900) document.getElementById('sidebar').classList.remove('open');
  });
});
function showView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  if(view==='dashboard')    renderDashboard();
  if(view==='yearly')       renderYearly();
  if(view==='monthly')      renderMonthly();
  if(view==='weekly')       renderWeekly();
  if(view==='categories')   renderCategories();
  if(view==='transactions') renderTransactions();
}
function setBreadcrumb(parts){
  document.getElementById('breadcrumb').innerHTML=
    parts.map((p,i)=>`<span class="bc-item ${i===parts.length-1?'active':''}">${p}</span>`)
    .join('<span class="bc-sep">›</span>');
}
document.getElementById('menu-toggle').addEventListener('click',()=>{
  document.getElementById('sidebar').classList.toggle('open');
});

// ══════════════════════════════════════════════════
// YEAR + MONTH PILLS (cascading)
// ══════════════════════════════════════════════════
function buildYearPills(){
  const years=Object.keys(CONFIG.files).sort((a,b)=>b-a);
  const yc=document.getElementById('year-pills');
  yc.innerHTML='';

  // "All" pill
  const all=document.createElement('button');
  all.className='year-pill'+(State.currentMonth==='all'&&State.currentYear===State.currentYear?'':' ');
  all.className='year-pill active'; all.textContent='All'; all.dataset.year='all';
  yc.appendChild(all);

  years.forEach(y=>{
    const b=document.createElement('button');
    b.className='year-pill'+(y===State.currentYear?' active':'');
    b.textContent=y; b.dataset.year=y;
    yc.appendChild(b);
  });

  // Set "All" active only if no specific year selected — default: currentYear active
  yc.querySelectorAll('.year-pill').forEach(p=>{
    p.classList.toggle('active', p.dataset.year===State.currentYear);
  });
  // "All" is active only if we want all-year view (not implemented as multi-load, so just visual)
  // Click handlers
  yc.querySelectorAll('.year-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      yc.querySelectorAll('.year-pill').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(btn.dataset.year==='all'){
        // Load default year, clear month filter
        State.currentMonth='all';
        loadYear(CONFIG.defaultYear);
      } else {
        State.currentYear=btn.dataset.year;
        State.currentMonth='all';
        loadYear(btn.dataset.year);
      }
      document.getElementById('month-pills').innerHTML='';
    });
  });
}

function buildMonthPills(){
  const months=[...new Set(State.allTx.map(t=>t.monthKey))].sort().reverse();
  const mc=document.getElementById('month-pills');
  mc.innerHTML='';
  months.forEach(mk=>{
    const tx0=State.allTx.find(t=>t.monthKey===mk);
    const b=document.createElement('button');
    b.className='month-pill'+(mk===State.currentMonth?' active':'');
    b.textContent=tx0?.month||mk; b.dataset.month=mk;
    b.addEventListener('click',()=>{
      mc.querySelectorAll('.month-pill').forEach(p=>p.classList.remove('active'));
      b.classList.add('active');
      State.currentMonth=mk;
      applyFilters();
      // Re-render active view
      const activeNav=document.querySelector('.nav-item.active');
      if(activeNav) showView(activeNav.dataset.view);
    });
    mc.appendChild(b);
  });
}

// ══════════════════════════════════════════════════
// DATA LOAD
// ══════════════════════════════════════════════════
function loadYear(year){
  const url=CONFIG.files[year]; if(!url) return;
  document.getElementById('loading-overlay').classList.remove('hidden');
  fetch(url+'?t='+Date.now())
    .then(r=>{if(!r.ok)throw new Error(r.status);return r.text();})
    .then(text=>{
      State.currentYear=year;
      State.allTx=parseCSV(text,year);
      State.filteredTx=[...State.allTx];
      buildYearPills();
      buildMonthPills();
      buildTxFilters();
      renderDashboard();
      document.getElementById('last-updated').textContent=`${State.allTx.length} tx · ${year}`;
    })
    .catch(err=>{console.error(err);document.getElementById('last-updated').textContent='Load error'})
    .finally(()=>document.getElementById('loading-overlay').classList.add('hidden'));
}

function buildTxFilters(){
  const cats=[...new Set(State.allTx.map(t=>t.category))].sort();
  const sc=document.getElementById('filter-cat');
  sc.innerHTML='<option value="">All Categories</option>';
  cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sc.appendChild(o);});
  const months=[...new Set(State.allTx.map(t=>t.monthKey))].sort().reverse();
  const sm=document.getElementById('filter-month');
  sm.innerHTML='<option value="">All Months</option>';
  months.forEach(mk=>{
    const tx0=State.allTx.find(t=>t.monthKey===mk);
    const o=document.createElement('option');o.value=mk;o.textContent=tx0?.month||mk;sm.appendChild(o);
  });
}

function applyFilters(){
  const search=document.getElementById('search-input').value.toLowerCase();
  const type=document.getElementById('filter-type')?.value||'';
  const cat=document.getElementById('filter-cat')?.value||'';
  const month=document.getElementById('filter-month')?.value||State.currentMonth;
  State.filteredTx=State.allTx.filter(t=>{
    if(month&&month!=='all'&&t.monthKey!==month) return false;
    if(type==='debit'&&t.debit===0) return false;
    if(type==='credit'&&t.credit===0) return false;
    if(cat&&t.category!==cat) return false;
    if(search&&!t.merchant.toLowerCase().includes(search)&&
       !t.desc.toLowerCase().includes(search)&&
       !t.category.toLowerCase().includes(search)) return false;
    return true;
  });
}

let searchTimer;
document.getElementById('search-input').addEventListener('input',()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{applyFilters();renderTransactions();},200);
});
['filter-type','filter-cat','filter-month'].forEach(id=>{
  document.getElementById(id)?.addEventListener('change',()=>{applyFilters();renderTransactions();});
});

// ══════════════════════════════════════════════════
// INLINE BAR LABEL PLUGIN (no external dependency)
// ══════════════════════════════════════════════════
const BarLabelPlugin = {
  id: 'barLabels',
  afterDraw(chart) {
    const ctx = chart.ctx;
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((bar, j) => {
        const val = ds.data[j];
        if (!val || val < 1) return;
        const barH = Math.abs(bar.base - bar.y);
        if (barH < 16) return;
        const label = val >= 1000 ? '€' + (val/1000).toFixed(1) + 'k' : '€' + Math.round(val);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = `bold ${barH < 28 ? 9 : 10}px DM Sans, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bar.x, (bar.y + bar.base) / 2);
        ctx.restore();
      });
    });
  }
};

// ── Build month-keyed data from allTx ─────────────────
function buildByMonth(txArr) {
  const byM = {};
  txArr.forEach(t => {
    if (!byM[t.monthKey]) byM[t.monthKey] = { i:0, e:0, lbl:t.month, net:0 };
    byM[t.monthKey].i += TRUE_INCOME_CATS.has(t.category) ? t.credit : 0;
    byM[t.monthKey].e += (!TRUE_INCOME_CATS.has(t.category) && t.debit > 0) ? t.debit : 0;
  });
  Object.values(byM).forEach(m => m.net = m.i - m.e);
  return byM;
}

function makeCashflowDatasets(keys, byM) {
  return [
    { label:'Income',   data:keys.map(k=>byM[k].i), backgroundColor:'rgba(74,222,128,.75)',  borderRadius:5 },
    { label:'Expenses', data:keys.map(k=>byM[k].e), backgroundColor:'rgba(248,113,113,.75)', borderRadius:5 },
  ];
}

function cashflowOptions(extraPlugins) {
  return {
    responsive: true, maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color:'#94A3B8', font:{size:11} } },
      tooltip: { callbacks: { label: c => `€${c.raw.toLocaleString('en',{minimumFractionDigits:2})}` } },
      ...extraPlugins,
    },
    scales: {
      x: { ticks:{color:'#64748B',font:{size:11}}, grid:{color:'rgba(255,255,255,.04)'} },
      y: { ticks:{color:'#64748B',font:{size:11},callback:v=>'€'+v.toLocaleString()}, grid:{color:'rgba(255,255,255,.04)'} },
    }
  };
}

// ══════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════
function renderDashboard(){
  const tx=getBudgetTx();
  const income=sumCredit(tx.filter(t=>TRUE_INCOME_CATS.has(t.category)));
  const expenses=sumDebit(tx.filter(t=>!TRUE_INCOME_CATS.has(t.category)));
  const net=income-expenses;
  const lastBal=tx.find(t=>t.balance>0)?.balance||0;

  document.getElementById('kpi-row').innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Income</div>
      <div class="kpi-value green">${fmt(income)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.credit>0&&TRUE_INCOME_CATS.has(t.category)).length} credits</div></div>
    <div class="kpi-card"><div class="kpi-label">Expenses</div>
      <div class="kpi-value red">${fmt(expenses)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.debit>0&&!TRUE_INCOME_CATS.has(t.category)).length} debits</div></div>
    <div class="kpi-card"><div class="kpi-label">Net Savings</div>
      <div class="kpi-value ${net>=0?'blue':'red'}">${fmt(net,true)}</div>
      <div class="kpi-sub">income − expenses</div></div>
    <div class="kpi-card"><div class="kpi-label">Closing Balance</div>
      <div class="kpi-value gold">${lastBal?fmt(lastBal):'—'}</div>
      <div class="kpi-sub">most recent</div></div>
  `;
  renderCashflowChart();
  renderBarChart(tx);
  renderDonutChart(tx);
}

function renderCashflowChart(){
  // Always use allTx — show last 5 months of available data
  const byM = buildByMonth(State.allTx);
  const allKeys = Object.keys(byM).sort();
  const keys = allKeys.slice(-5);

  const ctx = document.getElementById('chart-cashflow').getContext('2d');
  if (State.charts.cashflow) State.charts.cashflow.destroy();
  State.charts.cashflow = new Chart(ctx, {
    type: 'bar',
    plugins: [BarLabelPlugin],
    data: { labels: keys.map(k=>byM[k].lbl), datasets: makeCashflowDatasets(keys, byM) },
    options: cashflowOptions({})
  });
}

function renderBarChart(tx){
  const exp=tx.filter(t=>t.debit>0&&!TRUE_INCOME_CATS.has(t.category));
  const byCat={};exp.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.debit;});
  const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const ctx=document.getElementById('chart-bar').getContext('2d');
  if(State.charts.bar) State.charts.bar.destroy();
  State.charts.bar=new Chart(ctx,{
    type:'bar',
    data:{labels:sorted.map(e=>e[0]),datasets:[{label:'€',data:sorted.map(e=>e[1]),
      backgroundColor:sorted.map(e=>catAccent(e[0])+'CC'),borderRadius:5}]},
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`€${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
      scales:{
        x:{ticks:{color:'#64748B',font:{size:11},callback:v=>`€${v.toLocaleString()}`},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#94A3B8',font:{size:11}},grid:{display:false}},
      },
      onClick:(e,els,chart)=>{
        if(!els.length) return;
        const cat=sorted[els[0].index][0];
        navToCategory(cat);
      }
    }
  });
}

function renderDonutChart(tx){
  const exp=tx.filter(t=>t.debit>0&&!TRUE_INCOME_CATS.has(t.category));
  const byCat={};exp.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.debit;});
  const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const ctx=document.getElementById('chart-donut').getContext('2d');
  if(State.charts.donut) State.charts.donut.destroy();
  State.charts.donut=new Chart(ctx,{
    type:'doughnut',
    data:{labels:sorted.map(e=>e[0]),datasets:[{data:sorted.map(e=>e[1]),
      backgroundColor:sorted.map(e=>catAccent(e[0])+'CC'),borderColor:'#1B2A4A',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'63%',
      plugins:{legend:{position:'right',labels:{color:'#94A3B8',font:{size:10},boxWidth:11,padding:5}},
        tooltip:{callbacks:{label:c=>`${c.label}: €${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
      onClick:(e,els,chart)=>{if(!els.length)return;navToCategory(sorted[els[0].index][0]);}
    }
  });
}

function navToCategory(cat){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelector('[data-view="categories"]').classList.add('active');
  showView('categories');
  // Trigger the specific category
  setTimeout(()=>openCatDetail(cat),50);
}

// ══════════════════════════════════════════════════
// YEARLY OVERVIEW
// ══════════════════════════════════════════════════
function renderYearly(){
  const tx=State.allTx;if(!tx.length)return;
  const income=sumCredit(tx.filter(t=>TRUE_INCOME_CATS.has(t.category)));
  const expenses=sumDebit(tx.filter(t=>!TRUE_INCOME_CATS.has(t.category)));
  const net=income-expenses;

  document.getElementById('yearly-kpi').innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Total Income ${State.currentYear}</div><div class="kpi-value green">${fmt(income)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Expenses ${State.currentYear}</div><div class="kpi-value red">${fmt(expenses)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Net Savings</div><div class="kpi-value ${net>=0?'blue':'red'}">${fmt(net,true)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Transactions</div><div class="kpi-value gold">${tx.length}</div></div>
  `;

  const byM={};
  tx.forEach(t=>{
    if(!byM[t.monthKey]) byM[t.monthKey]={i:0,e:0,lbl:t.month};
    byM[t.monthKey].i+=TRUE_INCOME_CATS.has(t.category)?t.credit:0;
    byM[t.monthKey].e+=(!TRUE_INCOME_CATS.has(t.category)&&t.debit>0)?t.debit:0;
  });
  const keys=Object.keys(byM).sort();

  const ctx1=document.getElementById('chart-yearly-cashflow').getContext('2d');
  if(State.charts.yrCf) State.charts.yrCf.destroy();
  State.charts.yrCf=new Chart(ctx1,{
    type:'bar',
    data:{labels:keys.map(k=>byM[k].lbl),datasets:[
      {label:'Income',   data:keys.map(k=>byM[k].i),backgroundColor:'rgba(74,222,128,.7)', borderRadius:4},
      {label:'Expenses', data:keys.map(k=>byM[k].e),backgroundColor:'rgba(248,113,113,.7)',borderRadius:4},
    ]},
    options:{...chartCfg(),plugins:{...chartCfg().plugins,legend:{labels:{color:'#94A3B8',font:{size:11}}}}}
  });

  const expTx=tx.filter(t=>t.debit>0&&!TRUE_INCOME_CATS.has(t.category));
  const byCat={};expTx.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.debit;});
  const catSorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  const ctx2=document.getElementById('chart-yearly-cats').getContext('2d');
  if(State.charts.yrCats) State.charts.yrCats.destroy();
  State.charts.yrCats=new Chart(ctx2,{
    type:'bar',
    data:{labels:catSorted.map(e=>e[0]),datasets:[{label:'€',data:catSorted.map(e=>e[1]),
      backgroundColor:catSorted.map(e=>catAccent(e[0])+'CC'),borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`€${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
      scales:{x:{ticks:{color:'#64748B',font:{size:11},callback:v=>`€${v.toLocaleString()}`},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#94A3B8',font:{size:11}},grid:{display:false}}},
      onClick:(e,els,chart)=>{if(!els.length)return;navToCategory(catSorted[els[0].index][0]);}
    }
  });

  const ctx3=document.getElementById('chart-yearly-donut').getContext('2d');
  if(State.charts.yrDonut) State.charts.yrDonut.destroy();
  const top=catSorted.slice(0,8);
  State.charts.yrDonut=new Chart(ctx3,{
    type:'doughnut',
    data:{labels:top.map(e=>e[0]),datasets:[{data:top.map(e=>e[1]),
      backgroundColor:top.map(e=>catAccent(e[0])+'CC'),borderColor:'#1B2A4A',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'60%',
      plugins:{legend:{position:'right',labels:{color:'#94A3B8',font:{size:10},boxWidth:11,padding:5}},
        tooltip:{callbacks:{label:c=>`${c.label}: €${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}}}
  });

  const grid=document.getElementById('yearly-months-grid');grid.innerHTML='';
  keys.slice().reverse().forEach(mk=>{
    const m=byM[mk];const net2=m.i-m.e;
    const card=document.createElement('div');card.className='year-month-card';
    card.innerHTML=`<div class="year-month-title">${m.lbl}</div>
      <div class="year-month-row"><span class="year-month-label">Income</span><span class="year-month-val" style="color:#4ADE80">${fmt(m.i)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Expenses</span><span class="year-month-val" style="color:#F87171">${fmt(m.e)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Net</span><span class="year-month-val" style="color:${net2>=0?'#60A5FA':'#F87171'}">${fmt(net2,true)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Txns</span><span class="year-month-val">${tx.filter(t=>t.monthKey===mk).length}</span></div>`;
    card.addEventListener('click',()=>{
      State.currentMonth=mk;
      document.querySelectorAll('.month-pill').forEach(p=>p.classList.toggle('active',p.dataset.month===mk));
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      document.querySelector('[data-view="monthly"]').classList.add('active');
      showView('monthly');setBreadcrumb(['Monthly',m.lbl]);
    });
    grid.appendChild(card);
  });
}

// ══════════════════════════════════════════════════
// MONTHLY VIEW
// ══════════════════════════════════════════════════
function renderMonthly(){
  const byM=groupBy(State.allTx,'monthKey');
  const keys=Object.keys(byM).sort().reverse();
  const container=document.getElementById('monthly-list');container.innerHTML='';
  keys.forEach((mk,idx)=>{
    const txs=byM[mk].sort((a,b)=>b.date-a.date);
    const income=sumCredit(txs.filter(t=>TRUE_INCOME_CATS.has(t.category)));
    const expenses=sumDebit(txs.filter(t=>!TRUE_INCOME_CATS.has(t.category)));
    const net=income-expenses;
    const sec=document.createElement('div');sec.className='monthly-section';
    const isOpen=idx===0;
    sec.innerHTML=`
      <div class="section-toggle-header">
        <span class="toggle-title">${txs[0].month}</span>
        <div style="display:flex;align-items:center;gap:18px">
          <div class="toggle-stats">
            <div class="toggle-stat"><div class="toggle-stat-label">Income</div><div class="toggle-stat-val" style="color:#4ADE80">${fmt(income)}</div></div>
            <div class="toggle-stat"><div class="toggle-stat-label">Expenses</div><div class="toggle-stat-val" style="color:#F87171">${fmt(expenses)}</div></div>
            <div class="toggle-stat"><div class="toggle-stat-label">Net</div><div class="toggle-stat-val" style="color:${net>=0?'#60A5FA':'#F87171'}">${fmt(net,true)}</div></div>
            <div class="toggle-stat"><div class="toggle-stat-label">Txns</div><div class="toggle-stat-val">${txs.length}</div></div>
          </div>
          <span class="toggle-arrow ${isOpen?'open':''}">▼</span>
        </div>
      </div>
      <div class="section-body" style="display:${isOpen?'':'none'}">
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Merchant</th><th>Category</th>
            <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th><th>Line</th></tr></thead>
          <tbody>${txs.map(t=>`<tr>
            <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
            <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
            <td>${catBadge(t.category)}</td>
            <td class="${t.debit>0?'debit-cell':'num'}">${t.debit>0?fmt(t.debit):'—'}</td>
            <td class="${t.credit>0?'credit-cell':'num'}">${t.credit>0?fmt(t.credit):'—'}</td>
            <td class="balance-cell">${t.balance>0?fmt(t.balance):'—'}</td>
            <td>${sourceLink(t)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    const header=sec.querySelector('.section-toggle-header');
    const body=sec.querySelector('.section-body');
    const arrow=sec.querySelector('.toggle-arrow');
    let open=isOpen;
    header.addEventListener('click',()=>{open=!open;body.style.display=open?'':'none';arrow.classList.toggle('open',open);});
    container.appendChild(sec);
  });
}

// ══════════════════════════════════════════════════
// WEEKLY VIEW
// ══════════════════════════════════════════════════
function renderWeekly(){
  const expTx=State.allTx.filter(t=>t.debit>0&&!TRUE_INCOME_CATS.has(t.category));
  const byW=groupBy(expTx,'weekKey');
  const wkeys=Object.keys(byW).sort().reverse();

  const recent=[...wkeys].reverse().slice(-16);
  const ctx=document.getElementById('chart-weekly').getContext('2d');
  if(State.charts.weekly) State.charts.weekly.destroy();
  State.charts.weekly=new Chart(ctx,{
    type:'bar',
    data:{labels:recent.map(k=>byW[k][0].weekLabel.split('–')[0].trim()),
      datasets:[{label:'Expenses',data:recent.map(k=>sumDebit(byW[k])),
        backgroundColor:'rgba(248,113,113,.7)',borderRadius:4}]},
    options:chartCfg()
  });

  const container=document.getElementById('weekly-list');container.innerHTML='';
  wkeys.forEach((wk,idx)=>{
    const txs=byW[wk].sort((a,b)=>b.date-a.date);
    const total=sumDebit(txs);
    const sec=document.createElement('div');sec.className='weekly-section';
    const isOpen=idx===0;
    sec.innerHTML=`
      <div class="section-toggle-header">
        <span class="toggle-title" style="font-size:13px">${txs[0].weekLabel}</span>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-family:var(--font-mono);font-size:13px;color:#F87171">${fmt(total)}</span>
          <span class="toggle-arrow ${isOpen?'open':''}">▼</span>
        </div>
      </div>
      <div class="section-body" style="display:${isOpen?'':'none'}">
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th class="num">Amount</th><th>Line</th></tr></thead>
          <tbody>${txs.map(t=>`<tr>
            <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
            <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
            <td>${catBadge(t.category)}</td>
            <td class="debit-cell">${fmt(t.debit)}</td>
            <td>${sourceLink(t)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    const h=sec.querySelector('.section-toggle-header');
    const b=sec.querySelector('.section-body');
    const a=sec.querySelector('.toggle-arrow');
    let op=isOpen;
    h.addEventListener('click',()=>{op=!op;b.style.display=op?'':'none';a.classList.toggle('open',op);});
    container.appendChild(sec);
  });
}

// ══════════════════════════════════════════════════
// CATEGORIES — Level 0 grid + Level 1 full detail
// ══════════════════════════════════════════════════
function renderCategories(){
  document.getElementById('cat-level-0').classList.remove('hidden');
  document.getElementById('cat-level-1').classList.add('hidden');
  State.catDrillCat=null; State.catChartMonthFilter=null;

  const expTx=State.allTx.filter(t=>t.debit>0&&!TRUE_INCOME_CATS.has(t.category));
  const totalExp=sumDebit(expTx);
  const byCat=groupBy(expTx,'category');
  const sorted=Object.entries(byCat).sort((a,b)=>sumDebit(b[1])-sumDebit(a[1]));
  const maxAmt=sumDebit(sorted[0]?.[1]||[]);

  document.getElementById('cat-summary-bar').innerHTML=`
    <div class="cat-summary-stat"><div class="label">Total Expenses</div><div class="val" style="color:#F87171">${fmt(totalExp)}</div></div>
    <div class="cat-summary-stat"><div class="label">Categories</div><div class="val" style="color:#60A5FA">${sorted.length}</div></div>
    <div class="cat-summary-stat"><div class="label">Transactions</div><div class="val">${expTx.length}</div></div>
    <div class="cat-summary-stat"><div class="label">Period</div><div class="val" style="font-size:12px">${State.currentYear}</div></div>
  `;

  const grid=document.getElementById('cat-grid');grid.innerHTML='';
  sorted.forEach(([cat,txs])=>{
    const total=sumDebit(txs);const pct=totalExp>0?(total/totalExp*100).toFixed(1):0;
    const acc=catAccent(cat);const icon=CAT_ICON[cat]||'💰';
    const card=document.createElement('div');card.className='cat-card';
    card.style.setProperty('--accent-color',acc);
    card.innerHTML=`
      <div class="cat-card-emoji">${icon}</div>
      <div class="cat-card-name" style="color:${acc}">${cat}</div>
      <div class="cat-card-amount" style="color:${acc}">${fmt(total)}</div>
      <div class="cat-card-meta">${txs.length} transactions · ${pct}% of expenses</div>
      <div class="cat-card-bar"><div class="cat-card-bar-fill" style="width:${(total/maxAmt*100).toFixed(1)}%;background:${acc}"></div></div>
    `;
    card.addEventListener('click',()=>openCatDetail(cat));
    grid.appendChild(card);
  });

  setBreadcrumb(['Categories']);
}

function openCatDetail(cat){
  State.catDrillCat=cat; State.catChartMonthFilter=null;
  document.getElementById('cat-level-0').classList.add('hidden');
  document.getElementById('cat-level-1').classList.remove('hidden');

  const allCatTx=State.allTx.filter(t=>t.category===cat);
  const expTx=allCatTx.filter(t=>t.debit>0);
  const acc=catAccent(cat); const icon=CAT_ICON[cat]||'💰';

  document.getElementById('cat-l1-title').innerHTML=`<span style="color:${acc}">${icon} ${cat}</span>`;
  document.getElementById('cat-chart-label').textContent=cat;

  // KPI row
  const total=sumDebit(expTx);
  const months=[...new Set(expTx.map(t=>t.monthKey))];
  const avgM=months.length?total/months.length:0;
  const maxTx=expTx.length?Math.max(...expTx.map(t=>t.debit)):0;
  const income=sumCredit(allCatTx);
  document.getElementById('cat-kpi-row').innerHTML=`
    <div class="kpi-card"><div class="kpi-label">Total Spent</div><div class="kpi-value red">${fmt(total)}</div><div class="kpi-sub">${expTx.length} transactions</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg / Month</div><div class="kpi-value blue">${fmt(avgM)}</div><div class="kpi-sub">${months.length} active months</div></div>
    <div class="kpi-card"><div class="kpi-label">Largest Purchase</div><div class="kpi-value red">${fmt(maxTx)}</div></div>
    ${income>0?`<div class="kpi-card"><div class="kpi-label">Credits / Refunds</div><div class="kpi-value green">${fmt(income)}</div></div>`
    :`<div class="kpi-card"><div class="kpi-label">First Transaction</div><div class="kpi-value gold" style="font-size:14px">${expTx.length?expTx.slice(-1)[0].date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</div></div>`}
  `;

  // Monthly trend chart (clickable to filter table)
  const byM=groupBy(expTx,'monthKey');
  const mkeys=Object.keys(byM).sort();
  const ctx=document.getElementById('chart-cat-monthly').getContext('2d');
  if(State.charts.catMonthly) State.charts.catMonthly.destroy();
  State.charts.catMonthly=new Chart(ctx,{
    type:'bar',
    data:{labels:mkeys.map(k=>byM[k][0].month),
      datasets:[{label:cat,data:mkeys.map(k=>sumDebit(byM[k])),
        backgroundColor:mkeys.map(k=>k===State.catChartMonthFilter?acc:acc+'88'),
        borderColor:acc,borderWidth:1,borderRadius:5}]},
    options:{
      responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`€${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
      scales:{x:{ticks:{color:'#64748B',font:{size:11}},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#64748B',font:{size:11},callback:v=>`€${v.toLocaleString()}`},grid:{color:'rgba(255,255,255,.04)'}}},
      onClick:(e,els,chart)=>{
        if(!els.length){State.catChartMonthFilter=null;}
        else{
          const mk=mkeys[els[0].index];
          State.catChartMonthFilter=(State.catChartMonthFilter===mk?null:mk);
        }
        // Update bar colors
        chart.data.datasets[0].backgroundColor=mkeys.map(k=>k===State.catChartMonthFilter?acc:acc+'88');
        chart.update();
        renderCatTable(cat);
      }
    }
  });

  // Month filter dropdown for cat table
  const catMonthSel=document.getElementById('cat-filter-month');
  catMonthSel.innerHTML='<option value="">All Months</option>';
  mkeys.forEach(mk=>{
    const o=document.createElement('option');
    o.value=mk;o.textContent=byM[mk][0].month;
    catMonthSel.appendChild(o);
  });
  catMonthSel.value='';
  catMonthSel.onchange=()=>{
    State.catChartMonthFilter=catMonthSel.value||null;
    if(State.charts.catMonthly){
      State.charts.catMonthly.data.datasets[0].backgroundColor=mkeys.map(k=>k===State.catChartMonthFilter?acc:acc+'88');
      State.charts.catMonthly.update();
    }
    renderCatTable(cat);
  };

  document.getElementById('cat-search').value='';
  document.getElementById('cat-search').oninput=()=>renderCatTable(cat);

  // Top merchants
  const byMerchant=groupBy(expTx,'merchant');
  const mSorted=Object.entries(byMerchant).map(([m,txs])=>({m,total:sumDebit(txs),count:txs.length})).sort((a,b)=>b.total-a.total).slice(0,10);
  document.getElementById('cat-merchants').innerHTML=mSorted.map(r=>`
    <div class="merchant-row">
      <span class="merchant-name" title="${r.m}">${r.m}</span>
      <div class="merchant-stats">
        <span class="merchant-total">${fmt(r.total)}</span>
        <span class="merchant-count">${r.count} tx</span>
      </div>
    </div>`).join('');

  // Merchant bar chart
  const top8=mSorted.slice(0,8);
  const ctx2=document.getElementById('chart-cat-merchants').getContext('2d');
  if(State.charts.catMerch) State.charts.catMerch.destroy();
  State.charts.catMerch=new Chart(ctx2,{
    type:'bar',
    data:{labels:top8.map(r=>r.m.slice(0,20)),datasets:[{label:'€',data:top8.map(r=>r.total),
      backgroundColor:acc+'99',borderColor:acc,borderWidth:1,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`€${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
      scales:{x:{ticks:{color:'#64748B',font:{size:10},callback:v=>`€${v.toLocaleString()}`},grid:{color:'rgba(255,255,255,.04)'}},
        y:{ticks:{color:'#94A3B8',font:{size:10}},grid:{display:false}}}}
  });

  renderCatTable(cat);
  setBreadcrumb(['Categories',`${icon} ${cat}`]);
}

function renderCatTable(cat){
  const search=document.getElementById('cat-search').value.toLowerCase();
  const monthFilter=State.catChartMonthFilter;
  let txs=State.allTx.filter(t=>t.category===cat);
  if(monthFilter) txs=txs.filter(t=>t.monthKey===monthFilter);
  if(search) txs=txs.filter(t=>t.merchant.toLowerCase().includes(search)||t.desc.toLowerCase().includes(search));
  txs=txs.sort((a,b)=>b.date-a.date);
  document.getElementById('cat-row-count').textContent=`${txs.length} rows`;
  document.getElementById('cat-tx-body').innerHTML=txs.map(t=>`<tr>
    <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
    <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
    <td class="desc-cell" title="${t.desc}">${t.desc}</td>
    <td class="${t.debit>0?'debit-cell':'num'}">${t.debit>0?fmt(t.debit):'—'}</td>
    <td class="${t.credit>0?'credit-cell':'num'}">${t.credit>0?fmt(t.credit):'—'}</td>
    <td class="month-cell">${t.month}</td>
    <td>${sourceLink(t)}</td>
  </tr>`).join('');
}

document.getElementById('cat-back-0')?.addEventListener('click',()=>{
  document.getElementById('cat-level-0').classList.remove('hidden');
  document.getElementById('cat-level-1').classList.add('hidden');
  setBreadcrumb(['Categories']);
});

// ══════════════════════════════════════════════════
// ALL TRANSACTIONS
// ══════════════════════════════════════════════════
function renderTransactions(){
  applyFilters();
  const tx=[...State.filteredTx].sort((a,b)=>{
    const d=State.sortDir==='asc'?1:-1;
    if(State.sortCol==='date')    return d*(a.date-b.date);
    if(State.sortCol==='debit')   return d*(a.debit-b.debit);
    if(State.sortCol==='credit')  return d*(a.credit-b.credit);
    if(State.sortCol==='balance') return d*(a.balance-b.balance);
    if(State.sortCol==='merchant')return d*a.merchant.localeCompare(b.merchant);
    if(State.sortCol==='category')return d*a.category.localeCompare(b.category);
    return 0;
  });
  document.getElementById('row-count').textContent=`${tx.length} transactions`;
  document.getElementById('tx-body').innerHTML=tx.map(t=>`<tr>
    <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
    <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
    <td>${catBadge(t.category)}</td>
    <td class="${t.debit>0?'debit-cell':'num'}">${t.debit>0?fmt(t.debit):'—'}</td>
    <td class="${t.credit>0?'credit-cell':'num'}">${t.credit>0?fmt(t.credit):'—'}</td>
    <td class="balance-cell">${t.balance>0?fmt(t.balance):'—'}</td>
    <td>${sourceLink(t)}</td>
  </tr>`).join('');
}

document.querySelectorAll('#tx-table thead th[data-sort]').forEach(th=>{
  th.addEventListener('click',()=>{
    const col=th.dataset.sort;
    if(State.sortCol===col) State.sortDir=State.sortDir==='asc'?'desc':'asc';
    else{State.sortCol=col;State.sortDir='desc';}
    document.querySelectorAll('#tx-table thead th .sort-icon').forEach(s=>s.textContent='↕');
    const si=th.querySelector('.sort-icon');if(si) si.textContent=State.sortDir==='asc'?'↑':'↓';
    renderTransactions();
  });
});

// ══════════════════════════════════════════════════
// CASHFLOW MODAL — expanded 12-month view
// ══════════════════════════════════════════════════
function openCashflowModal(){
  State.cfModalOffset = 0;
  document.getElementById('cf-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderCashflowModal();
}

function closeCashflowModal(){
  document.getElementById('cf-modal').classList.add('hidden');
  document.body.style.overflow = '';
  if (State.charts.cfModal) { State.charts.cfModal.destroy(); State.charts.cfModal = null; }
}

function renderCashflowModal(){
  const byM = buildByMonth(State.allTx);
  const allKeys = Object.keys(byM).sort();

  // 12-month window ending at (allKeys.length - offset)
  const endIdx = allKeys.length - State.cfModalOffset;
  const startIdx = Math.max(0, endIdx - 12);
  const keys = allKeys.slice(startIdx, endIdx);

  // Nav state
  document.getElementById('cf-nav-prev').disabled = startIdx === 0;
  document.getElementById('cf-nav-next').disabled = State.cfModalOffset === 0;
  document.getElementById('cf-nav-label').textContent =
    keys.length ? `${byM[keys[0]].lbl}  –  ${byM[keys[keys.length-1]].lbl}` : '';

  // Summary row
  const totIncome   = keys.reduce((s,k)=>s+byM[k].i,0);
  const totExpenses = keys.reduce((s,k)=>s+byM[k].e,0);
  const totNet      = totIncome - totExpenses;
  document.getElementById('cf-modal-totals').innerHTML = `
    <span class="cf-total green">Income <strong>${fmt(totIncome)}</strong></span>
    <span class="cf-total red">Expenses <strong>${fmt(totExpenses)}</strong></span>
    <span class="cf-total ${totNet>=0?'blue':'red'}">Net <strong>${fmt(totNet,true)}</strong></span>
  `;

  // Monthly breakdown table
  document.getElementById('cf-modal-table-body').innerHTML = [...keys].reverse().map(k=>{
    const m = byM[k];
    const net = m.i - m.e;
    return `<tr>
      <td style="font-weight:600;color:var(--text)">${m.lbl}</td>
      <td style="color:#4ADE80;font-family:var(--font-mono)">${m.i>0?fmt(m.i):'—'}</td>
      <td style="color:#F87171;font-family:var(--font-mono)">${m.e>0?fmt(m.e):'—'}</td>
      <td style="color:${net>=0?'#60A5FA':'#F87171'};font-family:var(--font-mono)">${fmt(net,true)}</td>
    </tr>`;
  }).join('');

  // Chart
  const ctx = document.getElementById('chart-cf-modal').getContext('2d');
  if (State.charts.cfModal) State.charts.cfModal.destroy();
  State.charts.cfModal = new Chart(ctx, {
    type: 'bar',
    plugins: [BarLabelPlugin],
    data: { labels: keys.map(k=>byM[k].lbl), datasets: makeCashflowDatasets(keys, byM) },
    options: {
      ...cashflowOptions({}),
      maintainAspectRatio: false,
      scales: {
        x: { ticks:{color:'#64748B',font:{size:12}}, grid:{color:'rgba(255,255,255,.04)'} },
        y: { ticks:{color:'#64748B',font:{size:12},callback:v=>'€'+v.toLocaleString()}, grid:{color:'rgba(255,255,255,.04)'} },
      }
    }
  });
}

// Wire up modal controls
document.getElementById('cf-modal-close')?.addEventListener('click', closeCashflowModal);
document.getElementById('cf-modal')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeCashflowModal(); });
document.getElementById('cf-nav-prev')?.addEventListener('click', ()=>{
  const byM = buildByMonth(State.allTx);
  const allKeys = Object.keys(byM).sort();
  const maxOffset = allKeys.length - 1;
  State.cfModalOffset = Math.min(State.cfModalOffset + 12, maxOffset);
  renderCashflowModal();
});
document.getElementById('cf-nav-next')?.addEventListener('click', ()=>{
  State.cfModalOffset = Math.max(0, State.cfModalOffset - 12);
  renderCashflowModal();
});
document.addEventListener('keydown', e => { if(e.key==='Escape') closeCashflowModal(); });

// ══════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════
function init(){
  buildYearPills();
  loadYear(CONFIG.defaultYear);
}
