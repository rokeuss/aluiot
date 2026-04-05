<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nim · Bank Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

<!-- ═══════════════════════ LOCK SCREEN ═══════════════════════ -->
<div id="lock-screen">
  <div class="lock-card">
    <div class="lock-logo">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#1B2A4A"/>
        <path d="M20 8C16.686 8 14 10.686 14 14v2H12a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V18a2 2 0 00-2-2h-2v-2c0-3.314-2.686-6-6-6zm0 3a3 3 0 013 3v2h-6v-2a3 3 0 013-3zm0 10a2 2 0 110 4 2 2 0 010-4z" fill="#60A5FA"/>
      </svg>
    </div>
    <h1 class="lock-title">Nim · Finance</h1>
    <p class="lock-sub">Enter your PIN to continue</p>
    <div class="pin-display" id="pin-display">
      <span class="pin-dot" id="d0"></span>
      <span class="pin-dot" id="d1"></span>
      <span class="pin-dot" id="d2"></span>
      <span class="pin-dot" id="d3"></span>
    </div>
    <div class="numpad">
      <button class="num-btn" data-n="1">1</button>
      <button class="num-btn" data-n="2">2</button>
      <button class="num-btn" data-n="3">3</button>
      <button class="num-btn" data-n="4">4</button>
      <button class="num-btn" data-n="5">5</button>
      <button class="num-btn" data-n="6">6</button>
      <button class="num-btn" data-n="7">7</button>
      <button class="num-btn" data-n="8">8</button>
      <button class="num-btn" data-n="9">9</button>
      <button class="num-btn clear-btn" data-n="clear">⌫</button>
      <button class="num-btn" data-n="0">0</button>
      <button class="num-btn ok-btn" data-n="ok">↵</button>
    </div>
    <p class="lock-error" id="lock-error"></p>
  </div>
</div>

<!-- ═══════════════════════ APP ═══════════════════════ -->
<div id="app" class="hidden">
  <!-- Sidebar -->
  <aside id="sidebar">
    <div class="sidebar-logo">
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="8" fill="#2563EB"/>
        <path d="M20 8C16.686 8 14 10.686 14 14v2H12a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V18a2 2 0 00-2-2h-2v-2c0-3.314-2.686-6-6-6zm0 3a3 3 0 013 3v2h-6v-2a3 3 0 013-3zm0 10a2 2 0 110 4 2 2 0 010-4z" fill="white"/>
      </svg>
      <span>Nim Finance</span>
    </div>
    <nav class="sidebar-nav">
      <a href="#" class="nav-item active" data-view="dashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Dashboard
      </a>
      <a href="#" class="nav-item" data-view="transactions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h12M9 6h12M9 18h12M3 12h.01M3 6h.01M3 18h.01"/></svg>
        Transactions
      </a>
      <a href="#" class="nav-item" data-view="categories">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v10l6 4"/></svg>
        Categories
      </a>
      <a href="#" class="nav-item" data-view="monthly">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        Monthly
      </a>
    </nav>
    <div class="sidebar-year-selector">
      <label>Year</label>
      <select id="year-select"></select>
    </div>
    <div class="sidebar-footer">
      <span id="last-updated">Loading…</span>
    </div>
  </aside>

  <!-- Main content -->
  <main id="main">
    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <button id="menu-toggle" class="icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <h2 id="page-title">Dashboard</h2>
      </div>
      <div class="topbar-right">
        <div class="month-pills" id="month-pills"></div>
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" id="search-input" placeholder="Search transactions…" />
        </div>
      </div>
    </header>

    <!-- DASHBOARD VIEW -->
    <section id="view-dashboard" class="view active">
      <div class="kpi-row" id="kpi-row"></div>
      <div class="charts-row">
        <div class="chart-card wide">
          <h3>Monthly Cash Flow</h3>
          <canvas id="chart-cashflow"></canvas>
        </div>
        <div class="chart-card">
          <h3>Spending by Category</h3>
          <canvas id="chart-donut"></canvas>
        </div>
      </div>
      <div class="chart-card full">
        <h3>Top Categories This Period</h3>
        <canvas id="chart-bar"></canvas>
      </div>
    </section>

    <!-- TRANSACTIONS VIEW -->
    <section id="view-transactions" class="view hidden">
      <div class="table-toolbar">
        <div class="filter-group">
          <select id="filter-type">
            <option value="">All Types</option>
            <option value="debit">Debits only</option>
            <option value="credit">Credits only</option>
          </select>
          <select id="filter-cat">
            <option value="">All Categories</option>
          </select>
        </div>
        <span class="row-count" id="row-count"></span>
      </div>
      <div class="table-wrap">
        <table id="tx-table">
          <thead>
            <tr>
              <th data-sort="date">Date <span class="sort-icon">↕</span></th>
              <th data-sort="merchant">Merchant</th>
              <th data-sort="category">Category</th>
              <th data-sort="debit" class="num">Debit</th>
              <th data-sort="credit" class="num">Credit</th>
              <th data-sort="balance" class="num">Balance</th>
            </tr>
          </thead>
          <tbody id="tx-body"></tbody>
        </table>
      </div>
    </section>

    <!-- CATEGORIES VIEW -->
    <section id="view-categories" class="view hidden">
      <div class="cat-grid" id="cat-grid"></div>
      <div class="cat-detail hidden" id="cat-detail">
        <div class="cat-detail-header">
          <button id="cat-back" class="back-btn">← Back</button>
          <h3 id="cat-detail-title"></h3>
        </div>
        <div class="table-wrap">
          <table id="cat-table">
            <thead><tr>
              <th>Date</th><th>Merchant</th><th class="num">Debit</th><th class="num">Credit</th>
            </tr></thead>
            <tbody id="cat-body"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- MONTHLY VIEW -->
    <section id="view-monthly" class="view hidden">
      <div class="monthly-grid" id="monthly-grid"></div>
    </section>

  </main>
</div>

<div id="loading-overlay" class="hidden">
  <div class="spinner"></div>
  <p>Loading transactions…</p>
</div>

<script src="config.js"></script>
<script src="app.js"></script>
</body>
</html>
