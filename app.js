// ════════════════════════════════════════════════════
//  NIM BANK DASHBOARD  —  app.js (light theme + new features)
// ════════════════════════════════════════════════════

// ── Light-theme chart colors ──
const THEME = {
  text:        '#0F172A',
  text2:       '#475569',
  text3:       '#94A3B8',
  grid:        'rgba(15,23,42,0.06)',
  gridStrong:  'rgba(15,23,42,0.12)',
  card:        '#FFFFFF',
  border:      '#E3E8F0',
  blue:        '#2563EB',
  blueDark:    '#1D4ED8',
  blueLight:   '#60A5FA',
  blueSoft:    '#DBEAFE',
  green:       '#16A34A',
  red:         '#DC2626',
  gold:        '#CA8A04',
  purple:      '#7C3AED',
  // Chart fill variants
  incomeFill:  'rgba(34,197,94,0.75)',
  expenseFill: 'rgba(37,99,235,0.82)', // matches reference image
  trendLine:   '#1E3A8A',
  avgLine:     '#F59E0B',
};

const State = {
  allTx: [], filteredTx: [],
  currentYear: CONFIG.defaultYear,
  currentMonth: 'all',
  sortCol: 'date', sortDir: 'desc',
  charts: {},
  catDrillCat: null,
  catChartMonthFilter: null,
  cfModalOffset: 0,
  dashRange: 12,              // 6, 12, 24, or 'all'
  reassignTargetId: null,
  reassignSelectedCat: null,
};

// ══════════════════════════════════════════════════
// PERSISTENCE — user overrides & custom categories
// ══════════════════════════════════════════════════
const LS_OVERRIDES = 'nim_cat_overrides';
const LS_CUSTOM    = 'nim_custom_cats';

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_OVERRIDES) || '{}'); }
  catch(e) { return {}; }
}
function saveOverrides(o) {
  localStorage.setItem(LS_OVERRIDES, JSON.stringify(o));
}
function loadCustomCats() {
  try { return JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]'); }
  catch(e) { return []; }
}
function saveCustomCats(arr) {
  localStorage.setItem(LS_CUSTOM, JSON.stringify(arr));
}

// ── Built-in category rules ──
const CAT_RULES = [
  { cat:'Housekeeper',      icon:'🏡', test:(d,t,amt)=>/DONNA/i.test(d)||((/BOC TRANSFER/i.test(t)||(/TRANSFER/i.test(d)&&!/TIPS/i.test(t)))&&amt>=620&&amt<=680) },
  { cat:'Social Insurance', icon:'🏛️', test:(d)=>/SOCIAL INSURANCE/i.test(d) },
  { cat:'Salary',             icon:'💼', test:(d)=>/GLOBE INVEST|SALARY/i.test(d) },
  { cat:'Investment Returns', icon:'📈', test:(d,t)=>/INTERACTIVE BROKERS|1BANK/i.test(d) },
  { cat:'Credits / Refunds',  icon:'↩️', test:(d,t)=>/CREDIT VOUCH/i.test(d)||/OTHER CREDIT/i.test(t) },
  { cat:'Bank Fees',          icon:'🏦', test:(d,t)=>/IBU.MAINTENANCE|MAINTENANCE FEE/i.test(d)||/COMMISSION.*FEE/i.test(t) },
  { cat:'FX Fees',            icon:'💱', test:(d,t)=>/CARDTXNADMIN|CASH ADV FEE/i.test(d)||/OTHER DEBIT/i.test(t) },
  { cat:'Groceries',          icon:'🛒', test:(d)=>/SKLAVENITIS|ALPHAMEGA|METRO SUPER|ORANGE FRUIT|STEASA FRUIT|MARATHASA/i.test(d) },
  { cat:'Dining & Food',      icon:'🍽️', test:(d)=>/WOLT|WOOD N.FIRE|PAUL CAFE|NEOCONVENIENCE|SO EASY|THREE F|COFFEE HOUSE|E-PAYMENTS/i.test(d) },
  { cat:'Fuel',               icon:'⛽', test:(d)=>/ESSO|RAMOIL/i.test(d) },
  { cat:'Utilities & Bills',  icon:'💡', test:(d)=>/CYTA|CABLENET|WATER BOARD|EOANICOSIA/i.test(d) },
  { cat:'Sports & Fitness',   icon:'🏃', test:(d)=>/PLAYTOMIC|FUTSAL|PADELPRO|THEPADEL|RACKET|G\.C\. SPORTS/i.test(d) },
  { cat:'Subscriptions',      icon:'📱', test:(d)=>/NETFLIX|SPOTIFY|GOOGLE ONE|YOUTUBE|TRADINGVIEW|CLAUDE\.AI|CHATGPT|OPENAI|AWSEMEA|ROBLOX/i.test(d) },
  { cat:'Shopping & Clothing',icon:'🛍️', test:(d)=>/ZARA|OYSHO|JD SPORTS|BEAUTY BAR|DOTERRA|ANCHORBSHOP|MILAS|DUTY FREE|SKROUTZ|AMZN|AMAZON PRIME|GGLZ6V/i.test(d) },
  { cat:'Education & Family', icon:'📚', test:(d)=>/ELLINOMATHEIA|FEBE APP/i.test(d) },
  { cat:'Home & Hardware',    icon:'🏠', test:(d)=>/IKEA|LEROY MERLIN|SUPERHOME|BIONIC|VICAN|FOUR DAY CLEARANCE|AYKCO|STEPHANIS|SOLONION/i.test(d) },
  { cat:'Security (CCTV)',    icon:'🔒', test:(d)=>/CCTV|CHRISONS/i.test(d) },
  { cat:'Travel & Transport', icon:'✈️', test:(d)=>/ISRAIR|LARNACA AIRPORT|FACTORY K|THEMOC PARKING|WIZZ/i.test(d) },
  { cat:'Cash Withdrawals',   icon:'💵', test:(d)=>/ATM|CASH WITHDRAWAL|WITHDRAWAL AM 6011|WITHDRAWAL AM 6012/i.test(d) },
  { cat:'Trading Tools',      icon:'📊', test:(d)=>/TRADEIFY|BULENOX|TAKEPROFITT|BWOOST/i.test(d) },
  { cat:'Revolut Transfers',  icon:'🔄', test:(d)=>/REVOLUT/i.test(d) },
  { cat:'Internal Transfer',  icon:'🔁', test:(d,t)=>/BOC TRANSFER/i.test(t) },
  { cat:'Payments',           icon:'💳', test:(d,t)=>/TIPS/i.test(t) },
];

const TRADING_TOOL_PATTERNS = [
  { name:'Tradeify',   rx:/TRADEIFY/i },
  { name:'Bulenox',    rx:/BULENOX/i },
  { name:'TakeProfit', rx:/TAKEPROFITT?/i },
  { name:'BWoost',     rx:/BWOOST/i },
];

const BUILTIN_INCOME_CATS = new Set(['Salary','Investment Returns','Credits / Refunds','Internal Transfer','Housekeeper']);
const BUILTIN_TRUE_INCOME = new Set(['Salary','Investment Returns','Credits / Refunds']);

const BUILTIN_ACCENT = {
  'Groceries':'#10B981','Home & Hardware':'#3B82F6','Dining & Food':'#F59E0B',
  'Sports & Fitness':'#EC4899','Subscriptions':'#8B5CF6','Trading Tools':'#D97706',
  'Fuel':'#EF4444','Utilities & Bills':'#14B8A6','Travel & Transport':'#0EA5E9',
  'Cash Withdrawals':'#64748B','Shopping & Clothing':'#A855F7','Education & Family':'#22C55E',
  'Security (CCTV)':'#F97316','Revolut Transfers':'#38BDF8','Bank Fees':'#F87171',
  'FX Fees':'#FBBF24','Salary':'#16A34A','Investment Returns':'#0EA5E9',
  'Credits / Refunds':'#10B981','Internal Transfer':'#94A3B8','Payments':'#FB923C',
  'Housekeeper':'#A855F7','Social Insurance':'#22C55E','Other':'#94A3B8',
};

function allCategories() {
  const custom = loadCustomCats();
  const base = CAT_RULES.map(r => ({ cat:r.cat, icon:r.icon, color:BUILTIN_ACCENT[r.cat]||'#94A3B8', type:BUILTIN_TRUE_INCOME.has(r.cat)?'income':'expense' }));
  base.push({ cat:'Other', icon:'💰', color:'#94A3B8', type:'expense' });
  custom.forEach(c => {
    if (!base.find(b => b.cat === c.cat)) base.push(c);
  });
  return base;
}
function catMeta(cat) {
  return allCategories().find(c => c.cat === cat) || { cat, icon:'💰', color:'#94A3B8', type:'expense' };
}
const CAT_ICON  = new Proxy({}, { get:(_, k) => catMeta(k).icon });
const catAccent = c => catMeta(c).color;

function trueIncomeCats() {
  const set = new Set(BUILTIN_TRUE_INCOME);
  loadCustomCats().forEach(c => { if (c.type === 'income') set.add(c.cat); });
  return set;
}

function categorizeAuto(desc, txType, debit) {
  for (const r of CAT_RULES) if (r.test(desc||'', txType||'', debit||0)) return r.cat;
  return 'Other';
}
function categorize(id, desc, txType, debit) {
  const ov = loadOverrides();
  if (ov[id]) return ov[id];
  return categorizeAuto(desc, txType, debit);
}
function cleanMerchant(desc) {
  if (!desc) return '';
  return desc
    .replace(/\s+PURCHASE\s+.*/i,'').replace(/INWARD\s+\S+\s+by\s+/i,'FROM: ')
    .replace(/CardTxnAdmin\s+/i,'FX Fee: ').replace(/Cash Adv Fee\s+/i,'Cash Fee: ')
    .replace(/^[A-Z]{2}\s+\d{4}\s+/,'').replace(/\s{2,}/g,' ').trim().slice(0,50);
}

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
function pct(a,b) {
  if (!b) return 0;
  return ((a - b) / Math.abs(b)) * 100;
}

// ── Date / number parsers (unchanged logic) ──
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === 'date') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s.slice(0,10)); return isNaN(d)?null:d; }
  const eu = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (eu) { const [,day,mon,yr]=eu; const d=new Date(`${yr}-${mon.padStart(2,'0')}-${day.padStart(2,'0')}`); return isNaN(d)?null:d; }
  if (/^\d{5}$/.test(s)) { const d=new Date((parseInt(s)-25569)*86400*1000); return isNaN(d)?null:d; }
  const d = new Date(s); return isNaN(d)?null:d;
}
function parseNum(raw) {
  if (!raw && raw!==0) return 0;
  const s = String(raw).trim().replace(/\s/g,'');
  if (!s || s==='-' || s==='') return 0;
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g,'').replace(',','.'))||0;
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g,''))||0;
  return parseFloat(s)||0;
}

function parseCSV(text, year) {
  const rows = Papa.parse(text.trim(),{skipEmptyLines:true}).data;
  const tx=[]; let hi=-1;
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
  if(ci.date===-1||ci.debit===-1) return tx;
  for(let i=hi+1;i<rows.length;i++){
    const row=rows[i];
    const rawDate=String(row[ci.date]||'').trim();
    if(!rawDate||/^(total|balance|opening|closing|period)/i.test(rawDate)) continue;
    const dateObj=parseDate(rawDate);
    if(!dateObj) continue;
    if(dateObj.getFullYear() > new Date().getFullYear() + 1) continue;
    if(dateObj.getFullYear() < 2010) continue;
    const desc   = ci.desc>-1   ? String(row[ci.desc]  ||'').trim() : '';
    const txType = ci.txType>-1 ? String(row[ci.txType]||'').trim() : '';
    const debit  = ci.debit>-1  ? parseNum(row[ci.debit])  : 0;
    const credit = ci.credit>-1 ? parseNum(row[ci.credit]) : 0;
    const balance= ci.balance>-1? parseNum(row[ci.balance]): 0;
    if(debit===0&&credit===0) continue;
    const mk=`${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}`;
    const wk=weekStart(dateObj);
    const id = `${year}-${i}`;
    tx.push({
      id, csvLine:i+1, sourceFile:CONFIG.files[year],
      date:dateObj, dateStr:dateObj.toISOString().slice(0,10),
      month:dateObj.toLocaleString('en',{month:'short',year:'numeric'}),
      monthShort:dateObj.toLocaleString('en',{month:'short'}),
      monthKey:mk, weekKey:wk, weekLabel:weekLbl(dateObj),
      desc, merchant:cleanMerchant(desc), txType,
      debit, credit, balance,
      category: categorize(id, desc, txType, debit),
      year,
    });
  }
  return tx;
}
function weekStart(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()-t.getDay()+1);return t.toISOString().slice(0,10);}
function weekLbl(d){const m=new Date(d);m.setDate(m.getDate()-m.getDay()+1);const s=new Date(m);s.setDate(s.getDate()+6);const f=x=>x.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});return`${f(m)} – ${f(s)}`;}

// ── Helpers ──
const groupBy=(arr,k)=>arr.reduce((m,t)=>{(m[t[k]]||(m[t[k]]=[])).push(t);return m;},{});
const sumDebit=arr=>arr.reduce((s,t)=>s+t.debit,0);
const sumCredit=arr=>arr.reduce((s,t)=>s+t.credit,0);
function isTrueIncome(t) { return trueIncomeCats().has(t.category); }
function getBudgetTx(){
  if(State.currentMonth==='all') return State.allTx;
  return State.allTx.filter(t=>t.monthKey===State.currentMonth);
}
function sourceLink(t){
  return `<a class="source-link" href="${t.sourceFile}" target="_blank" title="${t.desc}">📄 L${t.csvLine}</a>`;
}
function catBadge(cat, txId){
  const a=catAccent(cat); const ic=CAT_ICON[cat]||'';
  const clickable = txId ? `onclick="openReassign('${txId}')"` : '';
  const cls = txId ? 'cat-badge editable' : 'cat-badge';
  return `<span class="${cls}" style="background:${a}22;color:${a};border-color:${a}44" ${clickable}>${ic} ${cat}</span>`;
}

// ── Light-theme chart config helpers ──
function lightScales(extra = {}) {
  return {
    x: { ticks:{color:THEME.text2,font:{size:11}}, grid:{color:THEME.grid}, ...(extra.x||{}) },
    y: { ticks:{color:THEME.text2,font:{size:11},callback:v=>'€'+v.toLocaleString()}, grid:{color:THEME.grid}, ...(extra.y||{}) },
  };
}
function lightLegend() {
  return { labels:{color:THEME.text2,font:{size:11}} };
}
function lightTooltip() {
  return { callbacks:{label:c=>`€${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`},
           backgroundColor:'#fff', titleColor:THEME.text, bodyColor:THEME.text2,
           borderColor:THEME.border, borderWidth:1, padding:10, cornerRadius:8 };
}

// ── Inline bar label plugin (dark-text for light theme) ──
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
        if (barH < 22) return;
        const label = val >= 1000 ? '€' + (val/1000).toFixed(1) + 'k' : '€' + Math.round(val);
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = `700 ${barH < 30 ? 10 : 11}px DM Sans, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bar.x, (bar.y + bar.base) / 2);
        ctx.restore();
      });
    });
  }
};

function buildByMonth(txArr) {
  const inc = trueIncomeCats();
  const byM = {};
  txArr.forEach(t => {
    if (!byM[t.monthKey]) byM[t.monthKey] = { i:0, e:0, lbl:t.month, net:0 };
    byM[t.monthKey].i += inc.has(t.category) ? t.credit : 0;
    byM[t.monthKey].e += (!inc.has(t.category) && t.debit > 0) ? t.debit : 0;
  });
  Object.values(byM).forEach(m => m.net = m.i - m.e);
  return byM;
}

function makeCashflowDatasets(keys, byM) {
  return [
    { label:'Income',   data:keys.map(k=>byM[k].i), backgroundColor:THEME.incomeFill,  borderRadius:6 },
    { label:'Expenses', data:keys.map(k=>byM[k].e), backgroundColor:THEME.expenseFill, borderRadius:6 },
  ];
}
function cashflowOptions(extraPlugins) {
  return {
    responsive:true, maintainAspectRatio:true,
    plugins:{ legend:lightLegend(), tooltip:lightTooltip(), ...extraPlugins },
    scales:lightScales(),
  };
}

// ══════════════════════════════════════════════════
// LOCK
// ══════════════════════════════════════════════════
const AUTH_KEY='nim_auth_ts';
const AUTH_TTL=24*60*60*1000;
(function(){
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
  if(view==='trends')       renderTrends();
  if(view==='monthly')      renderMonthly();
  if(view==='weekly')       renderWeekly();
  if(view==='categories')   renderCategories();
  if(view==='trading')      renderTrading();
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
// YEAR + MONTH PILLS
// ══════════════════════════════════════════════════
function buildYearPills(){
  const years=Object.keys(CONFIG.files).sort((a,b)=>b-a);
  const yc=document.getElementById('year-pills');
  yc.innerHTML='';
  const all=document.createElement('button');
  all.className='year-pill'; all.textContent='All'; all.dataset.year='all';
  yc.appendChild(all);
  years.forEach(y=>{
    const b=document.createElement('button');
    b.className='year-pill'+(y===State.currentYear?' active':'');
    b.textContent=y; b.dataset.year=y;
    yc.appendChild(b);
  });
  yc.querySelectorAll('.year-pill').forEach(p=>{
    p.classList.toggle('active', p.dataset.year===State.currentYear);
  });
  yc.querySelectorAll('.year-pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      yc.querySelectorAll('.year-pill').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(btn.dataset.year==='all'){
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
      const activeNav=document.querySelector('.nav-item.active');
      if(activeNav) showView(activeNav.dataset.view);
      else renderDashboard();
      document.getElementById('last-updated').textContent=`${State.allTx.length} tx · ${year}`;
      const bm = document.getElementById('banner-meta');
      if (bm) bm.textContent = `${State.allTx.length} transactions · ${year}`;
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

// ══════════════════════════════════════════════════
// SMART SEARCH
// ══════════════════════════════════════════════════
const MONTH_NAMES = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONTH_MAP = MONTH_NAMES.reduce((m,n,i)=>(m[n]=i,m),{});

function parseSearch(raw) {
  const q = { text:[], amount:null, month:null, cat:null, type:null };
  if (!raw) return q;
  const tokens = raw.toLowerCase().trim().split(/\s+/);
  // We may need to combine adjacent tokens e.g. "mar 2026"
  const used = new Array(tokens.length).fill(false);
  for (let i=0;i<tokens.length;i++){
    if (used[i]) continue;
    const tk = tokens[i];
    // Amount comparisons: >100, <50, >=100, <=50, =200, 10..80
    let m;
    if ((m = tk.match(/^>=(\d+(\.\d+)?)$/))) { q.amount = { op:'>=', val:parseFloat(m[1]) }; used[i]=true; continue; }
    if ((m = tk.match(/^<=(\d+(\.\d+)?)$/))) { q.amount = { op:'<=', val:parseFloat(m[1]) }; used[i]=true; continue; }
    if ((m = tk.match(/^>(\d+(\.\d+)?)$/)))  { q.amount = { op:'>',  val:parseFloat(m[1]) }; used[i]=true; continue; }
    if ((m = tk.match(/^<(\d+(\.\d+)?)$/)))  { q.amount = { op:'<',  val:parseFloat(m[1]) }; used[i]=true; continue; }
    if ((m = tk.match(/^=(\d+(\.\d+)?)$/)))  { q.amount = { op:'=',  val:parseFloat(m[1]) }; used[i]=true; continue; }
    if ((m = tk.match(/^(\d+(\.\d+)?)\.\.(\d+(\.\d+)?)$/))) { q.amount = { op:'range', min:parseFloat(m[1]), max:parseFloat(m[3]) }; used[i]=true; continue; }
    // Category
    if ((m = tk.match(/^cat:(.+)$/))) { q.cat = m[1]; used[i]=true; continue; }
    // Type
    if (tk === ':income')  { q.type = 'income';  used[i]=true; continue; }
    if (tk === ':expense') { q.type = 'expense'; used[i]=true; continue; }
    // YYYY-MM
    if ((m = tk.match(/^(\d{4})-(\d{1,2})$/))) { q.month = `${m[1]}-${m[2].padStart(2,'0')}`; used[i]=true; continue; }
    // month name +/- year
    const short = tk.slice(0,3);
    if (MONTH_MAP[short] !== undefined) {
      let yr = null;
      if (tokens[i+1] && /^\d{4}$/.test(tokens[i+1])) { yr = tokens[i+1]; used[i+1]=true; }
      q.month = { name: short, year: yr };
      used[i]=true; continue;
    }
    // Year only
    if (/^\d{4}$/.test(tk)) { q.month = { name:null, year: tk }; used[i]=true; continue; }
    // Free text
    q.text.push(tk); used[i]=true;
  }
  return q;
}

function matchSearch(t, q) {
  // Text: every term must appear in merchant/desc/category
  if (q.text.length) {
    const hay = (t.merchant + ' ' + t.desc + ' ' + t.category).toLowerCase();
    if (!q.text.every(term => hay.includes(term))) return false;
  }
  if (q.amount) {
    const v = t.debit > 0 ? t.debit : t.credit;
    const op = q.amount.op;
    if (op === '>'  && !(v >  q.amount.val)) return false;
    if (op === '<'  && !(v <  q.amount.val)) return false;
    if (op === '>=' && !(v >= q.amount.val)) return false;
    if (op === '<=' && !(v <= q.amount.val)) return false;
    if (op === '='  && Math.abs(v - q.amount.val) > 0.005) return false;
    if (op === 'range' && !(v >= q.amount.min && v <= q.amount.max)) return false;
  }
  if (q.cat) {
    if (!t.category.toLowerCase().includes(q.cat)) return false;
  }
  if (q.type === 'income' && t.credit === 0) return false;
  if (q.type === 'expense' && t.debit === 0) return false;
  if (q.month) {
    if (typeof q.month === 'string') {
      if (t.monthKey !== q.month) return false;
    } else {
      const dYr = String(t.date.getFullYear());
      const dMo = t.date.getMonth();
      if (q.month.year && dYr !== q.month.year) return false;
      if (q.month.name != null && MONTH_MAP[q.month.name] !== dMo) return false;
    }
  }
  return true;
}

function applyFilters(){
  const raw = document.getElementById('search-input').value;
  const q = parseSearch(raw);
  const type=document.getElementById('filter-type')?.value||'';
  const cat=document.getElementById('filter-cat')?.value||'';
  const month=document.getElementById('filter-month')?.value||State.currentMonth;
  State.filteredTx=State.allTx.filter(t=>{
    if(month&&month!=='all'&&t.monthKey!==month) return false;
    if(type==='debit'&&t.debit===0) return false;
    if(type==='credit'&&t.credit===0) return false;
    if(cat&&t.category!==cat) return false;
    return matchSearch(t, q);
  });
}

let searchTimer;
document.getElementById('search-input').addEventListener('input',()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{applyFilters();renderTransactions();},180);
});
['filter-type','filter-cat','filter-month'].forEach(id=>{
  document.getElementById(id)?.addEventListener('change',()=>{applyFilters();renderTransactions();});
});
document.getElementById('search-help')?.addEventListener('click',()=>{
  document.getElementById('search-hint-panel').classList.toggle('show');
});
document.addEventListener('click',e=>{
  if (!e.target.closest('.search-wrap')) document.getElementById('search-hint-panel')?.classList.remove('show');
});

// ══════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════
function renderDashboard(){
  const tx=getBudgetTx();
  const income=sumCredit(tx.filter(t=>isTrueIncome(t)));
  const expenses=sumDebit(tx.filter(t=>!isTrueIncome(t)));
  const net=income-expenses;
  const lastBal=tx.find(t=>t.balance>0)?.balance||0;

  // Trend hint for KPI: compare to previous month
  const byM = buildByMonth(State.allTx);
  const keys = Object.keys(byM).sort();
  let trendExp = null;
  if (keys.length >= 2) {
    const last = byM[keys[keys.length-1]].e;
    const prev = byM[keys[keys.length-2]].e;
    trendExp = pct(last, prev);
  }

  document.getElementById('kpi-row').innerHTML=`
    <div class="kpi-card kpi-income"><div class="kpi-label">Income</div>
      <div class="kpi-value green">${fmt(income)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.credit>0&&isTrueIncome(t)).length} credits</div></div>
    <div class="kpi-card kpi-expense"><div class="kpi-label">Expenses</div>
      <div class="kpi-value red">${fmt(expenses)}</div>
      <div class="kpi-sub">${tx.filter(t=>t.debit>0&&!isTrueIncome(t)).length} debits</div>
      ${trendExp!==null?`<span class="kpi-trend ${trendExp>1?'up':trendExp<-1?'down':'flat'}">${trendExp>0?'▲':trendExp<0?'▼':'■'} ${Math.abs(trendExp).toFixed(1)}% vs prev mo</span>`:''}</div>
    <div class="kpi-card kpi-net"><div class="kpi-label">Net Savings</div>
      <div class="kpi-value ${net>=0?'blue':'red'}">${fmt(net,true)}</div>
      <div class="kpi-sub">income − expenses</div></div>
    <div class="kpi-card kpi-balance"><div class="kpi-label">Closing Balance</div>
      <div class="kpi-value gold">${lastBal?fmt(lastBal):'—'}</div>
      <div class="kpi-sub">most recent</div></div>
  `;
  renderCashflowChart();
  renderTrendChart();
  renderBarChart(tx);
  renderDonutChart(tx);
}

function renderCashflowChart(){
  const byM = buildByMonth(State.allTx);
  const allKeys = Object.keys(byM).sort();
  const n = State.dashRange === 'all' ? allKeys.length : Math.min(State.dashRange, allKeys.length);
  const keys = allKeys.slice(-n);

  const ctx = document.getElementById('chart-cashflow').getContext('2d');
  if (State.charts.cashflow) State.charts.cashflow.destroy();
  State.charts.cashflow = new Chart(ctx, {
    type: 'bar',
    plugins: [BarLabelPlugin],
    data: { labels: keys.map(k=>byM[k].lbl), datasets: makeCashflowDatasets(keys, byM) },
    options: cashflowOptions({})
  });
}

function renderTrendChart(){
  const byM = buildByMonth(State.allTx);
  const keys = Object.keys(byM).sort();
  const values = keys.map(k => byM[k].e);
  // 3-month rolling average
  const avg = values.map((_, i) => {
    const start = Math.max(0, i - 2);
    const slice = values.slice(start, i+1);
    return slice.reduce((s,v)=>s+v,0) / slice.length;
  });

  const ctx = document.getElementById('chart-trend').getContext('2d');
  if (State.charts.trend) State.charts.trend.destroy();
  State.charts.trend = new Chart(ctx, {
    type:'line',
    data:{
      labels: keys.map(k=>byM[k].lbl),
      datasets:[
        { label:'Monthly', data:values, borderColor:THEME.expenseFill, backgroundColor:'rgba(37,99,235,0.12)',
          fill:true, tension:0.25, pointRadius:3, pointHoverRadius:5, borderWidth:2 },
        { label:'3-mo Avg', data:avg, borderColor:THEME.avgLine, borderDash:[6,4], borderWidth:2,
          fill:false, tension:0.25, pointRadius:0 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{legend:lightLegend(),tooltip:lightTooltip()},
      scales:lightScales(),
    }
  });

  // Summary boxes
  const n = values.length;
  const last = values[n-1] || 0;
  const prev = values[n-2] || 0;
  const yearAvg = n ? values.reduce((s,v)=>s+v,0)/n : 0;
  const max = Math.max(...values, 0);
  const dLast = pct(last, prev);
  const dVsAvg = pct(last, yearAvg);
  const sumEl = document.getElementById('trend-summary');
  if (sumEl) sumEl.innerHTML = `
    <div class="trend-stat"><div class="lbl">Latest Month</div><div class="val">${fmt(last)}</div>
      <div class="delta ${dLast>1?'up':dLast<-1?'down':'flat'}">${dLast>0?'▲':dLast<0?'▼':'■'} ${Math.abs(dLast).toFixed(1)}% vs prev</div></div>
    <div class="trend-stat"><div class="lbl">12-mo Avg</div><div class="val">${fmt(yearAvg)}</div>
      <div class="delta ${dVsAvg>1?'up':dVsAvg<-1?'down':'flat'}">${dVsAvg>0?'▲':dVsAvg<0?'▼':'■'} ${Math.abs(dVsAvg).toFixed(1)}% vs avg</div></div>
    <div class="trend-stat"><div class="lbl">Peak Month</div><div class="val">${fmt(max)}</div>
      <div class="delta flat">${n} months of data</div></div>
  `;
}

function renderBarChart(tx){
  const exp=tx.filter(t=>t.debit>0&&!isTrueIncome(t));
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
      plugins:{legend:{display:false},tooltip:lightTooltip()},
      scales:{
        x:{ticks:{color:THEME.text2,font:{size:11},callback:v=>'€'+v.toLocaleString()},grid:{color:THEME.grid}},
        y:{ticks:{color:THEME.text2,font:{size:11}},grid:{display:false}},
      },
      onClick:(e,els,chart)=>{
        if(!els.length) return;
        navToCategory(sorted[els[0].index][0]);
      }
    }
  });
}

function renderDonutChart(tx){
  const exp=tx.filter(t=>t.debit>0&&!isTrueIncome(t));
  const byCat={};exp.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.debit;});
  const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const ctx=document.getElementById('chart-donut').getContext('2d');
  if(State.charts.donut) State.charts.donut.destroy();
  State.charts.donut=new Chart(ctx,{
    type:'doughnut',
    data:{labels:sorted.map(e=>e[0]),datasets:[{data:sorted.map(e=>e[1]),
      backgroundColor:sorted.map(e=>catAccent(e[0])+'CC'),borderColor:THEME.card,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'63%',
      plugins:{legend:{position:'right',labels:{color:THEME.text2,font:{size:10},boxWidth:11,padding:5}},
        tooltip:{...lightTooltip(),callbacks:{label:c=>`${c.label}: €${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}},
      onClick:(e,els,chart)=>{if(!els.length)return;navToCategory(sorted[els[0].index][0]);}
    }
  });
}

function navToCategory(cat){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelector('[data-view="categories"]').classList.add('active');
  showView('categories');
  setTimeout(()=>openCatDetail(cat),50);
}

// Range buttons on dashboard
document.querySelectorAll('.range-btn[data-range]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.range-btn[data-range]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const r = btn.dataset.range;
    State.dashRange = r === 'all' ? 'all' : parseInt(r);
    renderCashflowChart();
  });
});

// ══════════════════════════════════════════════════
// YEARLY OVERVIEW
// ══════════════════════════════════════════════════
function renderYearly(){
  const tx=State.allTx;if(!tx.length)return;
  const income=sumCredit(tx.filter(t=>isTrueIncome(t)));
  const expenses=sumDebit(tx.filter(t=>!isTrueIncome(t)));
  const net=income-expenses;

  document.getElementById('yearly-kpi').innerHTML=`
    <div class="kpi-card kpi-income"><div class="kpi-label">Total Income ${State.currentYear}</div><div class="kpi-value green">${fmt(income)}</div></div>
    <div class="kpi-card kpi-expense"><div class="kpi-label">Total Expenses ${State.currentYear}</div><div class="kpi-value red">${fmt(expenses)}</div></div>
    <div class="kpi-card kpi-net"><div class="kpi-label">Net Savings</div><div class="kpi-value ${net>=0?'blue':'red'}">${fmt(net,true)}</div></div>
    <div class="kpi-card kpi-balance"><div class="kpi-label">Transactions</div><div class="kpi-value gold">${tx.length}</div></div>
  `;

  const byM = buildByMonth(tx);
  const keys=Object.keys(byM).sort();

  const ctx1=document.getElementById('chart-yearly-cashflow').getContext('2d');
  if(State.charts.yrCf) State.charts.yrCf.destroy();
  State.charts.yrCf=new Chart(ctx1,{
    type:'bar',
    plugins:[BarLabelPlugin],
    data:{labels:keys.map(k=>byM[k].lbl),datasets:makeCashflowDatasets(keys, byM)},
    options:cashflowOptions({})
  });

  const expTx=tx.filter(t=>t.debit>0&&!isTrueIncome(t));
  const byCat={};expTx.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.debit;});
  const catSorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  const ctx2=document.getElementById('chart-yearly-cats').getContext('2d');
  if(State.charts.yrCats) State.charts.yrCats.destroy();
  State.charts.yrCats=new Chart(ctx2,{
    type:'bar',
    data:{labels:catSorted.map(e=>e[0]),datasets:[{label:'€',data:catSorted.map(e=>e[1]),
      backgroundColor:catSorted.map(e=>catAccent(e[0])+'CC'),borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:lightTooltip()},
      scales:{x:{ticks:{color:THEME.text2,font:{size:11},callback:v=>'€'+v.toLocaleString()},grid:{color:THEME.grid}},
        y:{ticks:{color:THEME.text2,font:{size:11}},grid:{display:false}}},
      onClick:(e,els,chart)=>{if(!els.length)return;navToCategory(catSorted[els[0].index][0]);}
    }
  });

  const ctx3=document.getElementById('chart-yearly-donut').getContext('2d');
  if(State.charts.yrDonut) State.charts.yrDonut.destroy();
  const top=catSorted.slice(0,8);
  State.charts.yrDonut=new Chart(ctx3,{
    type:'doughnut',
    data:{labels:top.map(e=>e[0]),datasets:[{data:top.map(e=>e[1]),
      backgroundColor:top.map(e=>catAccent(e[0])+'CC'),borderColor:THEME.card,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'60%',
      plugins:{legend:{position:'right',labels:{color:THEME.text2,font:{size:10},boxWidth:11,padding:5}},
        tooltip:{...lightTooltip(),callbacks:{label:c=>`${c.label}: €${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}}}
  });

  const grid=document.getElementById('yearly-months-grid');grid.innerHTML='';
  keys.slice().reverse().forEach(mk=>{
    const m=byM[mk];const net2=m.i-m.e;
    const card=document.createElement('div');card.className='year-month-card';
    card.innerHTML=`<div class="year-month-title">${m.lbl}</div>
      <div class="year-month-row"><span class="year-month-label">Income</span><span class="year-month-val" style="color:${THEME.green}">${fmt(m.i)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Expenses</span><span class="year-month-val" style="color:${THEME.red}">${fmt(m.e)}</span></div>
      <div class="year-month-row"><span class="year-month-label">Net</span><span class="year-month-val" style="color:${net2>=0?THEME.blueDark:THEME.red}">${fmt(net2,true)}</span></div>
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
// TRENDS VIEW
// ══════════════════════════════════════════════════
function renderTrends(){
  const tx = State.allTx;
  if (!tx.length) return;
  const byM = buildByMonth(tx);
  const keys = Object.keys(byM).sort();
  const vals = keys.map(k => byM[k].e);
  const avg3 = vals.map((_, i) => {
    const s = Math.max(0, i - 2);
    const sl = vals.slice(s, i+1);
    return sl.reduce((a,b)=>a+b,0)/sl.length;
  });
  const total = vals.reduce((s,v)=>s+v,0);
  const mean = vals.length ? total/vals.length : 0;
  const max = Math.max(...vals, 0);
  const min = Math.min(...vals.filter(v=>v>0), 0);
  const latest = vals[vals.length-1] || 0;
  const dLast = vals.length >= 2 ? pct(latest, vals[vals.length-2]) : 0;

  document.getElementById('trends-kpi').innerHTML = `
    <div class="kpi-card kpi-expense"><div class="kpi-label">Latest Month</div>
      <div class="kpi-value red">${fmt(latest)}</div>
      <span class="kpi-trend ${dLast>1?'up':dLast<-1?'down':'flat'}">${dLast>0?'▲':dLast<0?'▼':'■'} ${Math.abs(dLast).toFixed(1)}%</span></div>
    <div class="kpi-card kpi-net"><div class="kpi-label">Avg / Month</div><div class="kpi-value blue">${fmt(mean)}</div><div class="kpi-sub">over ${vals.length} months</div></div>
    <div class="kpi-card kpi-balance"><div class="kpi-label">Peak Month</div><div class="kpi-value gold">${fmt(max)}</div></div>
    <div class="kpi-card kpi-income"><div class="kpi-label">Lowest Month</div><div class="kpi-value green">${fmt(min)}</div></div>
  `;

  // Full history chart
  const ctx = document.getElementById('chart-trends-full').getContext('2d');
  if (State.charts.trendsFull) State.charts.trendsFull.destroy();
  State.charts.trendsFull = new Chart(ctx, {
    type:'line',
    data:{
      labels: keys.map(k=>byM[k].lbl),
      datasets:[
        { type:'bar', label:'Monthly', data:vals, backgroundColor:THEME.expenseFill, borderRadius:4, order:2 },
        { type:'line', label:'3-mo Avg', data:avg3, borderColor:THEME.avgLine, borderDash:[6,4], borderWidth:2, fill:false, tension:0.25, pointRadius:0, order:1 },
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:lightLegend(),tooltip:lightTooltip()},scales:lightScales()}
  });

  // Top categories over time
  const topCats = Object.entries(tx.filter(t=>t.debit>0&&!isTrueIncome(t))
      .reduce((m,t)=>{m[t.category]=(m[t.category]||0)+t.debit;return m;},{}))
    .sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);
  const datasets = topCats.map((cat,idx) => {
    const data = keys.map(k => tx.filter(t=>t.monthKey===k && t.category===cat && t.debit>0).reduce((s,t)=>s+t.debit,0));
    return { label:cat, data, borderColor:catAccent(cat), backgroundColor:catAccent(cat)+'22',
             tension:0.3, borderWidth:2, fill:false, pointRadius:2 };
  });
  const ctx2 = document.getElementById('chart-trends-cats').getContext('2d');
  if (State.charts.trendsCats) State.charts.trendsCats.destroy();
  State.charts.trendsCats = new Chart(ctx2, {
    type:'line',
    data:{labels:keys.map(k=>byM[k].lbl),datasets},
    options:{responsive:true,maintainAspectRatio:true,plugins:{legend:lightLegend(),tooltip:lightTooltip()},scales:lightScales()}
  });

  // Year-over-Year comparison: expenses by month, grouped by year
  const byYr = {};
  keys.forEach(k => {
    const [y, mo] = k.split('-');
    if (!byYr[y]) byYr[y] = Array(12).fill(0);
    byYr[y][parseInt(mo)-1] += byM[k].e;
  });
  const yoyColors = [THEME.blueLight, THEME.blue, THEME.blueDark, THEME.purple, THEME.gold];
  const yoyDatasets = Object.keys(byYr).sort().map((y,i)=>({
    label:y, data:byYr[y],
    backgroundColor:yoyColors[i%yoyColors.length]+'CC',
    borderRadius:3,
  }));
  const ctx3 = document.getElementById('chart-trends-yoy').getContext('2d');
  if (State.charts.trendsYoy) State.charts.trendsYoy.destroy();
  State.charts.trendsYoy = new Chart(ctx3, {
    type:'bar',
    data:{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],datasets:yoyDatasets},
    options:{responsive:true,maintainAspectRatio:true,plugins:{legend:lightLegend(),tooltip:lightTooltip()},scales:lightScales()}
  });
}

// ══════════════════════════════════════════════════
// TRADING VIEW
// ══════════════════════════════════════════════════
function renderTrading(){
  const tx = State.allTx.filter(t => t.category === 'Trading Tools' && t.debit > 0);
  const total = sumDebit(tx);
  const byM = {};
  tx.forEach(t => {
    if (!byM[t.monthKey]) byM[t.monthKey] = { lbl:t.month, total:0, count:0 };
    byM[t.monthKey].total += t.debit;
    byM[t.monthKey].count++;
  });
  const keys = Object.keys(byM).sort();
  const months = keys.length;
  const avgM = months ? total / months : 0;
  const latest = keys.length ? byM[keys[keys.length-1]].total : 0;

  document.getElementById('trading-meta').textContent = `${tx.length} transactions · ${fmt(total)} total`;

  document.getElementById('trading-kpi').innerHTML = `
    <div class="kpi-card kpi-expense"><div class="kpi-label">Total Spent</div>
      <div class="kpi-value red">${fmt(total)}</div><div class="kpi-sub">${tx.length} transactions</div></div>
    <div class="kpi-card kpi-net"><div class="kpi-label">Avg / Month</div>
      <div class="kpi-value blue">${fmt(avgM)}</div><div class="kpi-sub">${months} active months</div></div>
    <div class="kpi-card kpi-balance"><div class="kpi-label">Latest Month</div>
      <div class="kpi-value gold">${fmt(latest)}</div></div>
    <div class="kpi-card kpi-income"><div class="kpi-label">Active Tools</div>
      <div class="kpi-value green">${TRADING_TOOL_PATTERNS.filter(p => tx.some(t => p.rx.test(t.desc))).length}</div></div>
  `;

  // Monthly chart
  const ctx = document.getElementById('chart-trading-monthly').getContext('2d');
  if (State.charts.tradingMonthly) State.charts.tradingMonthly.destroy();
  State.charts.tradingMonthly = new Chart(ctx, {
    type:'bar',
    plugins:[BarLabelPlugin],
    data:{labels:keys.map(k=>byM[k].lbl),datasets:[{label:'Trading Spend',
      data:keys.map(k=>byM[k].total),backgroundColor:THEME.expenseFill,borderRadius:5}]},
    options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:lightTooltip()},scales:lightScales()}
  });

  // Per-tool breakdown
  const byTool = {};
  tx.forEach(t => {
    let matched = 'Other';
    for (const p of TRADING_TOOL_PATTERNS) if (p.rx.test(t.desc)) { matched = p.name; break; }
    if (!byTool[matched]) byTool[matched] = { total:0, count:0 };
    byTool[matched].total += t.debit;
    byTool[matched].count++;
  });
  const toolEntries = Object.entries(byTool).sort((a,b)=>b[1].total-a[1].total);

  const ctx2 = document.getElementById('chart-trading-tools').getContext('2d');
  if (State.charts.tradingTools) State.charts.tradingTools.destroy();
  const toolColors = [THEME.blue, THEME.blueDark, THEME.blueLight, THEME.purple, THEME.gold, THEME.green];
  State.charts.tradingTools = new Chart(ctx2, {
    type:'doughnut',
    data:{labels:toolEntries.map(e=>e[0]),datasets:[{data:toolEntries.map(e=>e[1].total),
      backgroundColor:toolEntries.map((_,i)=>toolColors[i%toolColors.length]),borderColor:THEME.card,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:true,cutout:'60%',
      plugins:{legend:{position:'right',labels:{color:THEME.text2,font:{size:11}}},
        tooltip:{...lightTooltip(),callbacks:{label:c=>`${c.label}: €${c.raw.toLocaleString('en',{minimumFractionDigits:2})}`}}}}
  });

  // Tool cards
  document.getElementById('trading-tools-grid').innerHTML = toolEntries.map(([name, info])=>`
    <div class="trading-tool-card">
      <div class="t-name">${name}</div>
      <div class="t-total">${fmt(info.total)}</div>
      <div class="t-meta">${info.count} purchases</div>
    </div>
  `).join('');

  // Tx table
  document.getElementById('trading-tx-body').innerHTML = tx.slice().sort((a,b)=>b.date-a.date).map(t=>{
    let tool = '—';
    for (const p of TRADING_TOOL_PATTERNS) if (p.rx.test(t.desc)) { tool = p.name; break; }
    return `<tr>
      <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td>${tool}</td>
      <td class="desc-cell" title="${t.desc}">${t.desc}</td>
      <td class="debit-cell">${fmt(t.debit)}</td>
      <td class="month-cell">${t.month}</td>
      <td>${sourceLink(t)}</td>
    </tr>`;
  }).join('');
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
    const income=sumCredit(txs.filter(t=>isTrueIncome(t)));
    const expenses=sumDebit(txs.filter(t=>!isTrueIncome(t)));
    const net=income-expenses;
    const sec=document.createElement('div');sec.className='monthly-section';
    const isOpen=idx===0;
    sec.innerHTML=`
      <div class="section-toggle-header">
        <span class="toggle-title">${txs[0].month}</span>
        <div style="display:flex;align-items:center;gap:18px">
          <div class="toggle-stats">
            <div class="toggle-stat"><div class="toggle-stat-label">Income</div><div class="toggle-stat-val" style="color:${THEME.green}">${fmt(income)}</div></div>
            <div class="toggle-stat"><div class="toggle-stat-label">Expenses</div><div class="toggle-stat-val" style="color:${THEME.red}">${fmt(expenses)}</div></div>
            <div class="toggle-stat"><div class="toggle-stat-label">Net</div><div class="toggle-stat-val" style="color:${net>=0?THEME.blueDark:THEME.red}">${fmt(net,true)}</div></div>
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
            <td>${catBadge(t.category, t.id)}</td>
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
  const expTx=State.allTx.filter(t=>t.debit>0&&!isTrueIncome(t));
  const byW=groupBy(expTx,'weekKey');
  const wkeys=Object.keys(byW).sort().reverse();
  const recent=[...wkeys].reverse().slice(-16);
  const ctx=document.getElementById('chart-weekly').getContext('2d');
  if(State.charts.weekly) State.charts.weekly.destroy();
  State.charts.weekly=new Chart(ctx,{
    type:'bar',
    data:{labels:recent.map(k=>byW[k][0].weekLabel.split('–')[0].trim()),
      datasets:[{label:'Expenses',data:recent.map(k=>sumDebit(byW[k])),
        backgroundColor:THEME.expenseFill,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:lightTooltip()},scales:lightScales()}
  });

  const container=document.getElementById('weekly-list');container.innerHTML='';
  wkeys.forEach((wk,idx)=>{
    const txs=byW[wk].sort((a,b)=>b.date-a.date);
    const total=sumDebit(txs);
    const sec=document.createElement('div');sec.className='weekly-section';
    const isOpen=idx===0;
    sec.innerHTML=`
      <div class="section-toggle-header">
        <span class="toggle-title" style="font-size:14px">${txs[0].weekLabel}</span>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-family:var(--font-mono);font-size:13px;color:${THEME.red};font-weight:500">${fmt(total)}</span>
          <span class="toggle-arrow ${isOpen?'open':''}">▼</span>
        </div>
      </div>
      <div class="section-body" style="display:${isOpen?'':'none'}">
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th class="num">Amount</th><th>Line</th></tr></thead>
          <tbody>${txs.map(t=>`<tr>
            <td class="date-cell">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
            <td class="merchant-cell" title="${t.desc}">${t.merchant}</td>
            <td>${catBadge(t.category, t.id)}</td>
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
// CATEGORIES — grid + detail
// ══════════════════════════════════════════════════
function renderCategories(){
  document.getElementById('cat-level-0').classList.remove('hidden');
  document.getElementById('cat-level-1').classList.add('hidden');
  State.catDrillCat=null; State.catChartMonthFilter=null;

  const expTx=State.allTx.filter(t=>t.debit>0&&!isTrueIncome(t));
  const totalExp=sumDebit(expTx);
  const byCat=groupBy(expTx,'category');
  const sorted=Object.entries(byCat).sort((a,b)=>sumDebit(b[1])-sumDebit(a[1]));
  const maxAmt=sumDebit(sorted[0]?.[1]||[]);

  document.getElementById('cat-summary-bar').innerHTML=`
    <div class="cat-summary-stat"><div class="label">Total Expenses</div><div class="val" style="color:${THEME.red}">${fmt(totalExp)}</div></div>
    <div class="cat-summary-stat"><div class="label">Categories</div><div class="val" style="color:${THEME.blueDark}">${sorted.length}</div></div>
    <div class="cat-summary-stat"><div class="label">Transactions</div><div class="val">${expTx.length}</div></div>
    <div class="cat-summary-stat"><div class="label">Period</div><div class="val" style="font-size:14px">${State.currentYear}</div></div>
    <button class="add-cat-btn" id="add-cat-btn">+ New Category</button>
  `;
  document.getElementById('add-cat-btn').addEventListener('click',()=>openNewCat());

  const grid=document.getElementById('cat-grid');grid.innerHTML='';
  sorted.forEach(([cat,txs])=>{
    const total=sumDebit(txs);const pctS=totalExp>0?(total/totalExp*100).toFixed(1):0;
    const acc=catAccent(cat);const icon=CAT_ICON[cat]||'💰';
    const card=document.createElement('div');card.className='cat-card';
    card.style.setProperty('--accent-color',acc);
    card.innerHTML=`
      <div class="cat-card-emoji">${icon}</div>
      <div class="cat-card-name" style="color:${acc}">${cat}</div>
      <div class="cat-card-amount">${fmt(total)}</div>
      <div class="cat-card-meta">${txs.length} transactions · ${pctS}% of expenses</div>
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

  const total=sumDebit(expTx);
  const months=[...new Set(expTx.map(t=>t.monthKey))];
  const avgM=months.length?total/months.length:0;
  const maxTx=expTx.length?Math.max(...expTx.map(t=>t.debit)):0;
  const income=sumCredit(allCatTx);
  document.getElementById('cat-kpi-row').innerHTML=`
    <div class="kpi-card kpi-expense"><div class="kpi-label">Total Spent</div><div class="kpi-value red">${fmt(total)}</div><div class="kpi-sub">${expTx.length} transactions</div></div>
    <div class="kpi-card kpi-net"><div class="kpi-label">Avg / Month</div><div class="kpi-value blue">${fmt(avgM)}</div><div class="kpi-sub">${months.length} active months</div></div>
    <div class="kpi-card kpi-balance"><div class="kpi-label">Largest Purchase</div><div class="kpi-value gold">${fmt(maxTx)}</div></div>
    ${income>0?`<div class="kpi-card kpi-income"><div class="kpi-label">Credits / Refunds</div><div class="kpi-value green">${fmt(income)}</div></div>`
    :`<div class="kpi-card kpi-income"><div class="kpi-label">First Transaction</div><div class="kpi-value green" style="font-size:14px">${expTx.length?expTx.slice(-1)[0].date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</div></div>`}
  `;

  const byM=groupBy(expTx,'monthKey');
  const mkeys=Object.keys(byM).sort();
  const ctx=document.getElementById('chart-cat-monthly').getContext('2d');
  if(State.charts.catMonthly) State.charts.catMonthly.destroy();
  State.charts.catMonthly=new Chart(ctx,{
    type:'bar',
    plugins:[BarLabelPlugin],
    data:{labels:mkeys.map(k=>byM[k][0].month),
      datasets:[{label:cat,data:mkeys.map(k=>sumDebit(byM[k])),
        backgroundColor:mkeys.map(k=>k===State.catChartMonthFilter?acc:acc+'88'),
        borderColor:acc,borderWidth:1,borderRadius:5}]},
    options:{
      responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:lightTooltip()},
      scales:lightScales(),
      onClick:(e,els,chart)=>{
        if(!els.length){State.catChartMonthFilter=null;}
        else{
          const mk=mkeys[els[0].index];
          State.catChartMonthFilter=(State.catChartMonthFilter===mk?null:mk);
        }
        chart.data.datasets[0].backgroundColor=mkeys.map(k=>k===State.catChartMonthFilter?acc:acc+'88');
        chart.update();
        renderCatTable(cat);
      }
    }
  });

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

  const top8=mSorted.slice(0,8);
  const ctx2=document.getElementById('chart-cat-merchants').getContext('2d');
  if(State.charts.catMerch) State.charts.catMerch.destroy();
  State.charts.catMerch=new Chart(ctx2,{
    type:'bar',
    data:{labels:top8.map(r=>r.m.slice(0,20)),datasets:[{label:'€',data:top8.map(r=>r.total),
      backgroundColor:acc+'CC',borderColor:acc,borderWidth:1,borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:true,
      plugins:{legend:{display:false},tooltip:lightTooltip()},
      scales:{x:{ticks:{color:THEME.text2,font:{size:10},callback:v=>'€'+v.toLocaleString()},grid:{color:THEME.grid}},
        y:{ticks:{color:THEME.text2,font:{size:10}},grid:{display:false}}}}
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
    <td>${catBadge(t.category, t.id)}</td>
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
// CASHFLOW MODAL
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
  const endIdx = allKeys.length - State.cfModalOffset;
  const startIdx = Math.max(0, endIdx - 12);
  const keys = allKeys.slice(startIdx, endIdx);
  document.getElementById('cf-nav-prev').disabled = startIdx === 0;
  document.getElementById('cf-nav-next').disabled = State.cfModalOffset === 0;
  document.getElementById('cf-nav-label').textContent =
    keys.length ? `${byM[keys[0]].lbl}  –  ${byM[keys[keys.length-1]].lbl}` : '';
  const totIncome   = keys.reduce((s,k)=>s+byM[k].i,0);
  const totExpenses = keys.reduce((s,k)=>s+byM[k].e,0);
  const totNet      = totIncome - totExpenses;
  document.getElementById('cf-modal-totals').innerHTML = `
    <span class="cf-total green">Income <strong>${fmt(totIncome)}</strong></span>
    <span class="cf-total red">Expenses <strong>${fmt(totExpenses)}</strong></span>
    <span class="cf-total ${totNet>=0?'blue':'red'}">Net <strong>${fmt(totNet,true)}</strong></span>
  `;
  document.getElementById('cf-modal-table-body').innerHTML = [...keys].reverse().map(k=>{
    const m = byM[k]; const net = m.i - m.e;
    return `<tr>
      <td style="font-weight:600;color:var(--text)">${m.lbl}</td>
      <td style="color:${THEME.green};font-family:var(--font-mono)">${m.i>0?fmt(m.i):'—'}</td>
      <td style="color:${THEME.red};font-family:var(--font-mono)">${m.e>0?fmt(m.e):'—'}</td>
      <td style="color:${net>=0?THEME.blueDark:THEME.red};font-family:var(--font-mono)">${fmt(net,true)}</td>
    </tr>`;
  }).join('');
  const ctx = document.getElementById('chart-cf-modal').getContext('2d');
  if (State.charts.cfModal) State.charts.cfModal.destroy();
  State.charts.cfModal = new Chart(ctx, {
    type: 'bar',
    plugins: [BarLabelPlugin],
    data: { labels: keys.map(k=>byM[k].lbl), datasets: makeCashflowDatasets(keys, byM) },
    options: { ...cashflowOptions({}), maintainAspectRatio: false }
  });
}
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
document.addEventListener('keydown', e => {
  if(e.key==='Escape') {
    closeCashflowModal();
    closeReassign();
    closeNewCat();
  }
});

// ══════════════════════════════════════════════════
// RECATEGORIZE MODAL
// ══════════════════════════════════════════════════
function openReassign(txId) {
  const t = State.allTx.find(x => x.id === txId);
  if (!t) return;
  State.reassignTargetId = txId;
  State.reassignSelectedCat = t.category;
  document.getElementById('reassign-meta').innerHTML = `
    <div><strong>${t.merchant || t.desc}</strong></div>
    <div style="margin-top:3px">${t.date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} · ${t.debit>0?fmt(t.debit):fmt(t.credit)} · Currently <strong>${t.category}</strong></div>
    <div style="margin-top:6px;font-size:11px;color:var(--text-3)">${t.desc}</div>
  `;
  buildCatPickGrid();
  document.getElementById('reassign-modal').classList.remove('hidden');
}
function closeReassign() {
  document.getElementById('reassign-modal').classList.add('hidden');
  State.reassignTargetId = null;
  State.reassignSelectedCat = null;
}
function buildCatPickGrid() {
  const grid = document.getElementById('cat-pick-grid');
  grid.innerHTML = '';
  allCategories().forEach(c => {
    const b = document.createElement('div');
    b.className = 'cat-pick' + (State.reassignSelectedCat === c.cat ? ' selected' : '');
    b.innerHTML = `<span class="emo">${c.icon}</span><span>${c.cat}</span>`;
    b.style.borderLeft = `3px solid ${c.color}`;
    b.addEventListener('click', () => {
      State.reassignSelectedCat = c.cat;
      buildCatPickGrid();
    });
    grid.appendChild(b);
  });
}
document.getElementById('reassign-close')?.addEventListener('click', closeReassign);
document.getElementById('reassign-cancel')?.addEventListener('click', closeReassign);
document.getElementById('reassign-modal')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeReassign(); });
document.getElementById('reassign-save')?.addEventListener('click', () => {
  if (!State.reassignTargetId || !State.reassignSelectedCat) return closeReassign();
  const o = loadOverrides();
  o[State.reassignTargetId] = State.reassignSelectedCat;
  saveOverrides(o);
  applyOverridesToState();
  closeReassign();
  refreshCurrentView();
});
document.getElementById('reassign-reset')?.addEventListener('click', () => {
  if (!State.reassignTargetId) return closeReassign();
  const o = loadOverrides();
  delete o[State.reassignTargetId];
  saveOverrides(o);
  applyOverridesToState();
  closeReassign();
  refreshCurrentView();
});
document.getElementById('open-new-cat')?.addEventListener('click', () => openNewCat(true));

function applyOverridesToState() {
  const ov = loadOverrides();
  State.allTx.forEach(t => {
    t.category = ov[t.id] || categorizeAuto(t.desc, t.txType, t.debit);
  });
  State.filteredTx = [...State.allTx];
  buildTxFilters();
}
function refreshCurrentView() {
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) showView(activeNav.dataset.view);
}

// ══════════════════════════════════════════════════
// NEW-CATEGORY MODAL
// ══════════════════════════════════════════════════
const EMOJI_CHOICES = ['💼','🎯','🎨','🎁','🎮','🎭','🎵','📦','📚','🔧','🔨','🏠','🏡','🏢','🏥','🐾','🌱','🌞','⭐','✨','💡','💰','💎','💊','💻','📱','📷','🍕','🍎','☕','🚗','🚲','✈️','⛵','🏖️','⚡','🔥','💧','🎓','👶','👪','🐶','🐱','🎾','⚽','🎳','🎬','🎤','🎸'];
const COLOR_CHOICES = ['#2563EB','#1D4ED8','#3B82F6','#0EA5E9','#06B6D4','#14B8A6','#10B981','#22C55E','#84CC16','#EAB308','#F59E0B','#F97316','#EF4444','#EC4899','#D946EF','#A855F7','#8B5CF6','#6366F1','#64748B','#0F172A'];

function openNewCat(fromReassign=false) {
  document.getElementById('newcat-modal').classList.remove('hidden');
  document.getElementById('newcat-name').value = '';
  const emoWrap = document.getElementById('newcat-emoji');
  emoWrap.innerHTML = EMOJI_CHOICES.map((e,i)=>`<div class="emoji-opt${i===0?' selected':''}" data-e="${e}">${e}</div>`).join('');
  emoWrap.querySelectorAll('.emoji-opt').forEach(el=>{
    el.addEventListener('click',()=>{
      emoWrap.querySelectorAll('.emoji-opt').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  const colWrap = document.getElementById('newcat-color');
  colWrap.innerHTML = COLOR_CHOICES.map((c,i)=>`<div class="color-opt${i===0?' selected':''}" data-c="${c}" style="background:${c}"></div>`).join('');
  colWrap.querySelectorAll('.color-opt').forEach(el=>{
    el.addEventListener('click',()=>{
      colWrap.querySelectorAll('.color-opt').forEach(x=>x.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
  document.getElementById('newcat-save').onclick = () => {
    const name = document.getElementById('newcat-name').value.trim();
    if (!name) { document.getElementById('newcat-name').focus(); return; }
    const emo = emoWrap.querySelector('.emoji-opt.selected')?.dataset.e || '💰';
    const color = colWrap.querySelector('.color-opt.selected')?.dataset.c || '#64748B';
    const type = document.getElementById('newcat-type').value;
    const custom = loadCustomCats();
    if (custom.find(c=>c.cat===name) || CAT_RULES.find(r=>r.cat===name)) {
      alert('A category with that name already exists.'); return;
    }
    custom.push({ cat:name, icon:emo, color, type });
    saveCustomCats(custom);
    closeNewCat();
    if (fromReassign) {
      State.reassignSelectedCat = name;
      buildCatPickGrid();
    } else {
      applyOverridesToState();
      refreshCurrentView();
    }
  };
}
function closeNewCat() { document.getElementById('newcat-modal').classList.add('hidden'); }
document.getElementById('newcat-close')?.addEventListener('click', closeNewCat);
document.getElementById('newcat-cancel')?.addEventListener('click', closeNewCat);
document.getElementById('newcat-modal')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeNewCat(); });

// Expose recategorize function globally for inline onclick
window.openReassign = openReassign;
window.openCashflowModal = openCashflowModal;

// ══════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════
function init(){
  // Global Chart defaults for light theme
  if (window.Chart) {
    Chart.defaults.color = THEME.text2;
    Chart.defaults.font.family = 'DM Sans, sans-serif';
    Chart.defaults.borderColor = THEME.border;
  }
  buildYearPills();
  loadYear(CONFIG.defaultYear);
}
