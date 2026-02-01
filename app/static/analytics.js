/**
 * analytics.js
 * Initialises charts, populates the logs table, and simulates
 * periodic KPI updates.  All data is placeholder — wire real
 * API responses in Phase 5.
 */
(function () {
  'use strict';

  // ── PLACEHOLDER LOG DATA ──────────────────────────────────
  const SEED_LOGS = [
    { ts: '2026-02-01 14:32:07', severity: 'info', service: 'orchestrator', msg: 'Container cloudx-project-3 provisioned successfully.' },
    { ts: '2026-02-01 14:31:55', severity: 'warning', service: 'postgres', msg: 'Query execution time exceeded 2 s threshold.' },
    { ts: '2026-02-01 14:31:40', severity: 'info', service: 'flask-app', msg: 'WebSocket client connected — session a1b2c3.' },
    { ts: '2026-02-01 14:30:12', severity: 'error', service: 'ci-pipeline', msg: 'Build #47 failed — syntax error in deploy.yml.' },
    { ts: '2026-02-01 14:29:58', severity: 'info', service: 'redis', msg: 'Cache warmed — 1 204 keys loaded.' },
    { ts: '2026-02-01 14:28:44', severity: 'info', service: 'flask-app', msg: 'GET /api/projects returned 200 (12 ms).' },
    { ts: '2026-02-01 14:27:31', severity: 'warning', service: 'orchestrator', msg: 'Container cloudx-project-7 memory usage at 82 %.' },
    { ts: '2026-02-01 14:26:19', severity: 'info', service: 'code-server', msg: 'User session started on workspace ws-09.' },
    { ts: '2026-02-01 14:25:05', severity: 'error', service: 'postgres', msg: 'Connection pool exhausted — max 20 reached.' },
    { ts: '2026-02-01 14:24:50', severity: 'info', service: 'ci-pipeline', msg: 'Build #48 started — branch: develop.' },
    { ts: '2026-02-01 14:23:37', severity: 'warning', service: 'flask-app', msg: 'Rate limit approaching for client 192.168.1.42.' },
    { ts: '2026-02-01 14:22:11', severity: 'info', service: 'orchestrator', msg: 'Workspace ws-09 health-check passed.' }
  ];

  // ── SEVERITY ICON MAP ─────────────────────────────────────
  const SEVERITY_ICONS = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-exclamation-circle'
  };

  // ── RENDER LOGS TABLE ─────────────────────────────────────
  function renderLogs(filter) {
    const tbody = document.getElementById('logsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    SEED_LOGS.forEach(function (log) {
      if (filter !== 'all' && log.severity !== filter) return;

      const tr = document.createElement('tr');
      tr.dataset.severity = log.severity;

      tr.innerHTML =
        '<td class="logs-table__timestamp">' + log.ts + '</td>' +
        '<td><span class="severity-badge severity-badge--' + log.severity + '">' +
        '<i class="fas ' + (SEVERITY_ICONS[log.severity] || '') + '"></i> ' +
        log.severity.charAt(0).toUpperCase() + log.severity.slice(1) +
        '</span></td>' +
        '<td class="logs-table__service">' + log.service + '</td>' +
        '<td class="logs-table__message">' + log.msg + '</td>';

      tbody.appendChild(tr);
    });
  }

  // ── FILTER BUTTONS ────────────────────────────────────────
  function initFilters() {
    const btns = document.querySelectorAll('.logs-filters__btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('logs-filters__btn--active'); });
        btn.classList.add('logs-filters__btn--active');
        renderLogs(btn.dataset.filter);
      });
    });
  }

  // ── SHARED CHART STYLE HELPERS ────────────────────────────
  function chartDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },   // we use our own inline legend
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          titleColor: '#F1F5F9',
          bodyColor: '#CBD5E1',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: { size: 12, family: 'Inter' },
          bodyFont: { size: 12, family: 'Inter' }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(226,232,240,0.6)', drawTicks: false },
          ticks: { color: '#94A3B8', font: { size: 11 }, maxTicksLimit: 7 }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(226,232,240,0.6)', drawTicks: false },
          ticks: { color: '#94A3B8', font: { size: 11 }, maxTicksLimit: 6 }
        }
      },
      interaction: { intersect: false, mode: 'index' }
    };
  }

  // Generate time labels for the last N hours
  function hourLabels(count) {
    const now = new Date();
    const labels = [];
    for (var i = count - 1; i >= 0; i--) {
      var h = new Date(now);
      h.setHours(h.getHours() - i);
      labels.push(h.getHours().toString().padStart(2, '0') + ':00');
    }
    return labels;
  }

  // ── RESOURCE UTILIZATION LINE CHART ───────────────────────
  function initResourceChart() {
    const canvas = document.getElementById('resourceTrendsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Gradient fills
    const cpuGrad = ctx.createLinearGradient(0, 0, 0, 260);
    cpuGrad.addColorStop(0, 'rgba(14, 165, 233, 0.28)');
    cpuGrad.addColorStop(1, 'rgba(14, 165, 233, 0.02)');

    const memGrad = ctx.createLinearGradient(0, 0, 0, 260);
    memGrad.addColorStop(0, 'rgba(139, 92, 246, 0.22)');
    memGrad.addColorStop(1, 'rgba(139, 92, 246, 0.02)');

    // Dummy 24-hour data
    var cpuData = [38, 42, 45, 40, 55, 60, 58, 52, 48, 65, 70, 62, 57, 63, 68, 72, 65, 59, 54, 61, 66, 70, 63, 58];
    var memData = [60, 62, 63, 61, 64, 67, 66, 63, 62, 68, 71, 69, 67, 70, 72, 74, 71, 68, 66, 69, 72, 74, 70, 67];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: hourLabels(24),
        datasets: [
          {
            label: 'CPU',
            data: cpuData,
            borderColor: '#0EA5E9',
            backgroundColor: cpuGrad,
            borderWidth: 2.5,
            tension: 0.38,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#0EA5E9',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Memory',
            data: memData,
            borderColor: '#8B5CF6',
            backgroundColor: memGrad,
            borderWidth: 2.5,
            tension: 0.38,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#8B5CF6',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: (function () {
        var o = chartDefaults();
        o.scales.y.max = 100;
        o.scales.y.ticks.callback = function (v) { return v + '%'; };
        o.plugins.tooltip.callbacks = {
          label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + '%'; }
        };
        return o;
      })()
    });
  }

  // ── NETWORK TRAFFIC AREA CHART ────────────────────────────
  function initNetworkChart() {
    const canvas = document.getElementById('networkTrafficChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const inGrad = ctx.createLinearGradient(0, 0, 0, 260);
    inGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    inGrad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');

    const outGrad = ctx.createLinearGradient(0, 0, 0, 260);
    outGrad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    outGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)');

    // Dummy 24-hour KB/s data
    var inbound = [42, 38, 55, 60, 72, 85, 78, 90, 105, 112, 98, 88, 95, 102, 118, 125, 110, 96, 88, 102, 115, 120, 108, 95];
    var outbound = [25, 22, 30, 35, 42, 48, 45, 52, 58, 62, 55, 50, 54, 60, 68, 72, 65, 57, 52, 60, 66, 70, 63, 55];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: hourLabels(24),
        datasets: [
          {
            label: 'Inbound',
            data: inbound,
            borderColor: '#10B981',
            backgroundColor: inGrad,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#10B981',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Outbound',
            data: outbound,
            borderColor: '#F59E0B',
            backgroundColor: outGrad,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#F59E0B',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: (function () {
        var o = chartDefaults();
        o.scales.y.ticks.callback = function (v) { return v + ' KB/s'; };
        o.plugins.tooltip.callbacks = {
          label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + ' KB/s'; }
        };
        return o;
      })()
    });
  }

  // ── LIVE KPI TICKER ──────────────────────────────────────
  // Jitters values every 4 s to simulate a live dashboard.
  function rand(min, max) {
    return +(Math.random() * (max - min) + min).toFixed(1);
  }

  function barColorClass(pct) {
    if (pct >= 80) return 'kpi-card__bar-fill--red';
    if (pct >= 55) return 'kpi-card__bar-fill--orange';
    return 'kpi-card__bar-fill--green';
  }

  function tickKPIs() {
    // CPU
    var cpu = rand(30, 85);
    document.getElementById('cpuValue').textContent = cpu + '%';
    var cpuBar = document.getElementById('cpuBar');
    cpuBar.style.width = cpu + '%';
    cpuBar.className = 'kpi-card__bar-fill ' + barColorClass(cpu);
    document.getElementById('cpuSub').textContent =
      cpu >= 80 ? 'High load' : cpu >= 55 ? 'Moderate load' : 'Normal load';

    // Memory
    var memPct = rand(40, 90);
    var memUsed = (memPct / 100 * 8).toFixed(1);
    document.getElementById('memValue').textContent = memUsed + ' GB / 8 GB';
    var memBar = document.getElementById('memBar');
    memBar.style.width = memPct + '%';
    memBar.className = 'kpi-card__bar-fill ' + barColorClass(memPct);
    document.getElementById('memSub').textContent = memPct.toFixed(0) + '% utilized';

    // Containers
    var containers = Math.round(rand(8, 18));
    document.getElementById('containerValue').textContent = containers;

    // Network
    var up = rand(40, 200);
    var down = rand(20, 120);
    document.getElementById('netValue').textContent = (up + down).toFixed(0) + ' KB/s';
    document.getElementById('netUp').textContent = up + ' KB/s';
    document.getElementById('netDown').textContent = down + ' KB/s';
  }

  // ── REFRESH BUTTON ────────────────────────────────────────
  function initRefresh() {
    var btn = document.getElementById('refreshBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.classList.add('is-spinning');
      tickKPIs();
      renderLogs('all');
      // Reset filter pills
      document.querySelectorAll('.logs-filters__btn').forEach(function (b) {
        b.classList.remove('logs-filters__btn--active');
      });
      var allBtn = document.querySelector('.logs-filters__btn[data-filter="all"]');
      if (allBtn) allBtn.classList.add('logs-filters__btn--active');

      setTimeout(function () { btn.classList.remove('is-spinning'); }, 600);

      if (typeof showToast === 'function') showToast('Analytics refreshed', 'success');
    });
  }

  // ── TIME-RANGE SELECTOR (stub) ────────────────────────────
  // Placeholder — connect to real API in Phase 5.
  function initTimeRange() {
    var sel = document.getElementById('timeRangeSelect');
    if (!sel) return;
    sel.addEventListener('change', function () {
      if (typeof showToast === 'function') {
        showToast('Switched to: ' + sel.options[sel.selectedIndex].text, 'info');
      }
    });
  }

  // ── BOOT ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    renderLogs('all');
    initFilters();
    initResourceChart();
    initNetworkChart();
    initRefresh();
    initTimeRange();

    // Start live KPI ticker
    setInterval(tickKPIs, 4000);
  });

})();