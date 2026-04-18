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

  function initResourceChart() {
    const canvas = document.getElementById('resourceTrendsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const font = { family: "'Inter', sans-serif" };
    const gridColor = 'rgba(226, 232, 240, 0.18)';
    const gray500 = '#64748B';

    const cpuGrad = ctx.createLinearGradient(0, 0, 0, 260);
    cpuGrad.addColorStop(0, 'rgba(14, 165, 233, 0.28)');
    cpuGrad.addColorStop(0.60, 'rgba(14, 165, 233, 0.07)');
    cpuGrad.addColorStop(1, 'rgba(14, 165, 233, 0.00)');

    const memGrad = ctx.createLinearGradient(0, 0, 0, 260);
    memGrad.addColorStop(0, 'rgba(139, 92, 246, 0.24)');
    memGrad.addColorStop(0.60, 'rgba(139, 92, 246, 0.05)');
    memGrad.addColorStop(1, 'rgba(139, 92, 246, 0.00)');

    const cpuData = [38, 42, 45, 40, 55, 60, 58, 52, 48, 65, 70, 62, 57, 63, 68, 72, 65, 59, 54, 61, 66, 70, 63, 58];
    const memData = [60, 62, 63, 61, 64, 67, 66, 63, 62, 68, 71, 69, 67, 70, 72, 74, 71, 68, 66, 69, 72, 74, 70, 67];

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
            borderWidth: 2,
            tension: 0.4,            // smooth tensioned curves
            fill: true,
            pointRadius: 0,
            pointHitRadius: 24,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#0EA5E9',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
          },
          {
            label: 'Memory',
            data: memData,
            borderColor: '#8B5CF6',
            backgroundColor: memGrad,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 24,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#8B5CF6',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleColor: '#F1F5F9',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            padding: { top: 10, right: 14, bottom: 10, left: 14 },
            cornerRadius: 10,
            titleFont: { ...font, size: 11, weight: '600' },
            bodyFont: { ...font, size: 12 },
            callbacks: { label: c => `  ${c.dataset.label}:  ${c.parsed.y}%` }
          }
        },
        scales: {
          x: {
            border: { display: false },
            grid: { display: false },           // ← X-grid hidden
            ticks: { color: gray500, font: { ...font, size: 11 }, maxTicksLimit: 7, padding: 8 }
          },
          y: {
            beginAtZero: false,
            min: 20, max: 100,
            border: { display: false, dash: [3, 4] },
            grid: { color: gridColor, drawTicks: false },
            ticks: {
              color: gray500, font: { ...font, size: 11 }, maxTicksLimit: 5,
              padding: 12, callback: v => v + '%'
            }
          }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  function initNetworkChart() {
    const canvas = document.getElementById('networkTrafficChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const font = { family: "'Inter', sans-serif" };
    const gridColor = 'rgba(226, 232, 240, 0.18)';
    const gray500 = '#64748B';

    const inGrad = ctx.createLinearGradient(0, 0, 0, 260);
    inGrad.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    inGrad.addColorStop(0.60, 'rgba(16, 185, 129, 0.06)');
    inGrad.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

    const outGrad = ctx.createLinearGradient(0, 0, 0, 260);
    outGrad.addColorStop(0, 'rgba(245, 158, 11, 0.26)');
    outGrad.addColorStop(0.60, 'rgba(245, 158, 11, 0.05)');
    outGrad.addColorStop(1, 'rgba(245, 158, 11, 0.00)');

    const inbound = [42, 38, 55, 60, 72, 85, 78, 90, 105, 112, 98, 88, 95, 102, 118, 125, 110, 96, 88, 102, 115, 120, 108, 95];
    const outbound = [25, 22, 30, 35, 42, 48, 45, 52, 58, 62, 55, 50, 54, 60, 68, 72, 65, 57, 52, 60, 66, 70, 63, 55];

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
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 24,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#10B981',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
          },
          {
            label: 'Outbound',
            data: outbound,
            borderColor: '#F59E0B',
            backgroundColor: outGrad,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 24,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#F59E0B',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleColor: '#F1F5F9',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            padding: { top: 10, right: 14, bottom: 10, left: 14 },
            cornerRadius: 10,
            titleFont: { ...font, size: 11, weight: '600' },
            bodyFont: { ...font, size: 12 },
            callbacks: { label: c => `  ${c.dataset.label}:  ${c.parsed.y} KB/s` }
          }
        },
        scales: {
          x: {
            border: { display: false },
            grid: { display: false },           // ← X-grid hidden
            ticks: { color: gray500, font: { ...font, size: 11 }, maxTicksLimit: 7, padding: 8 }
          },
          y: {
            beginAtZero: true,
            border: { display: false, dash: [3, 4] },
            grid: { color: gridColor, drawTicks: false },
            ticks: {
              color: gray500, font: { ...font, size: 11 }, maxTicksLimit: 5,
              padding: 12, callback: v => v + ' KB/s'
            }
          }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  // ── LIVE KPI TICKER ──────────────────────────────────────
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

(function () {
  'use strict';

  let network = null;
  let nodes = null;
  let edges = null;
  let dashOffset = 0;
  let rafId = null;

  const tooltip = document.getElementById('topology-tooltip');

  // ── Wait for vis reliably ───────────────────────────────────
  function waitForVis(cb, attempts) {
    attempts = attempts || 0;
    if (typeof vis !== 'undefined' && vis.DataSet && vis.Network) {
      cb();
    } else if (attempts < 40) {           // up to 10 s
      setTimeout(function () { waitForVis(cb, attempts + 1); }, 250);
    } else {
      console.error('[Topology] vis-network failed to load after 10 s');
      var c = document.getElementById('topology-network');
      if (c) c.innerHTML =
        '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;font-size:0.85rem">' +
        'Network graph unavailable — vis-network failed to load.</p>';
    }
  }

  // ── Tooltip helpers ─────────────────────────────────────────
  function showTooltip(x, y, html) {
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.classList.add('topology-tooltip--visible');

    var wrap = document.getElementById('topology-network');
    var pad = 14;
    var left = x + 16;
    var top = y - 16;

    if (left + 250 > wrap.offsetWidth - pad) left = x - 250 - 16;
    if (top + 200 > wrap.offsetHeight - pad) top = wrap.offsetHeight - 200 - pad;
    if (top < pad) top = pad;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function hideTooltip() {
    if (tooltip) tooltip.classList.remove('topology-tooltip--visible');
  }

  // ── Tooltip HTML builder ────────────────────────────────────
  function buildTooltipHTML(nodeData) {
    if (nodeData.id === 'orchestrator') {
      return [
        '<div class="ttt-header">',
        '  <span class="ttt-dot" style="background:var(--accent);box-shadow:0 0 8px var(--accent)"></span>',
        '  <span class="ttt-name">CloudX Orchestrator</span>',
        '  <span class="ttt-type ttt-type--orchestrator">Core</span>',
        '</div>',
        '<div class="ttt-row"><span class="ttt-key">Role</span><span class="ttt-val">Container manager</span></div>',
        '<div class="ttt-row"><span class="ttt-key">Status</span><span class="ttt-val ttt-val--running">● Running</span></div>',
      ].join('');
    }

    var status = nodeData._status || 'unknown';
    var valClass = status === 'running' ? 'ttt-val--running'
      : status === 'stopped' ? 'ttt-val--stopped'
        : 'ttt-val--error';
    var dotColor = status === 'running' ? 'var(--success)'
      : status === 'stopped' ? 'var(--warning)'
        : 'var(--error)';

    return [
      '<div class="ttt-header">',
      '  <span class="ttt-dot" style="background:' + dotColor + ';box-shadow:0 0 8px ' + dotColor + '"></span>',
      '  <span class="ttt-name">' + (nodeData.label || nodeData.id) + '</span>',
      '  <span class="ttt-type">Container</span>',
      '</div>',
      '<div class="ttt-row"><span class="ttt-key">ID</span><span class="ttt-val">' + String(nodeData.id).substring(0, 12) + '</span></div>',
      '<div class="ttt-row"><span class="ttt-key">Status</span><span class="ttt-val ' + valClass + '">● ' + status.charAt(0).toUpperCase() + status.slice(1) + '</span></div>',
    ].join('');
  }

  // ── Node count badge ────────────────────────────────────────
  function updateNodeCount(count) {
    var badge = document.getElementById('topoNodeCount');
    if (!badge) return;
    var span = badge.querySelector('span:last-child');
    if (span) span.textContent = count + ' node' + (count !== 1 ? 's' : '');
  }

  // ── Main init ───────────────────────────────────────────────
  function initLiveTopology() {
    var container = document.getElementById('topology-network');
    if (!container) return;

    // Force explicit pixel dimensions so vis-network never sees 0×0
    container.style.width = '100%';
    container.style.height = '500px';

    nodes = new vis.DataSet([
      {
        id: 'orchestrator',
        label: 'CloudX\nOrchestrator',
        shape: 'box',
        color: {
          background: '#1E1040',
          border: '#7C3AED',
          highlight: { background: '#2D1560', border: '#8B5CF6' },
          hover: { background: '#2D1560', border: '#8B5CF6' },
        },
        font: { color: '#DDD6FE', face: 'Inter', size: 14 },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(139,92,246,0.5)', size: 22, x: 0, y: 0 },
        margin: 12,
      }
    ]);
    edges = new vis.DataSet([]);

    var options = {
      nodes: {
        shape: 'dot',
        size: 18,
        font: { color: '#94A3B8', face: 'Inter', size: 13 },
        borderWidth: 2,
        borderWidthSelected: 3,
        shadow: { enabled: true, color: 'rgba(14,165,233,0.40)', size: 16, x: 0, y: 0 },
        color: {
          background: '#0C2A3A',
          border: '#0284C7',
          highlight: { background: '#0E3D52', border: '#0EA5E9' },
          hover: { background: '#0E3D52', border: '#38BDF8' },
        },
      },
      edges: {
        width: 1.5,
        color: {
          color: 'rgba(14,165,233,0.22)',
          highlight: 'rgba(56,189,248,0.80)',
          hover: 'rgba(14,165,233,0.65)',
        },
        dashes: [6, 5],           // ← clean initial value, no third offset arg
        smooth: { type: 'curvedCW', roundness: 0.14 },
        shadow: { enabled: true, color: 'rgba(14,165,233,0.15)', size: 8, x: 0, y: 0 },
        selectionWidth: 2.5,
        hoverWidth: 2.5,
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.28,
          springLength: 170,
          springConstant: 0.04,
          damping: 0.13,
        },
        stabilization: { iterations: 140, fit: true },
      },
      interaction: {
        hover: true,
        tooltipDelay: 9999,     // disable built-in title tooltip
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: false,
      },
    };

    network = new vis.Network(container, { nodes: nodes, edges: edges }, options);

    // ── Fit the graph once stabilized ──────────────────────────
    network.once('stabilized', function () {
      network.fit({ animation: { duration: 800, easingFunction: 'easeOutQuart' } });
    });

    // ── Custom HTML tooltip ────────────────────────────────────
    network.on('hoverNode', function (params) {
      var nodeData = nodes.get(params.node);
      if (!nodeData) return;
      var pos = network.canvasToDOM(network.getPosition(params.node));
      showTooltip(pos.x, pos.y, buildTooltipHTML(nodeData));
    });

    network.on('blurNode', hideTooltip);
    network.on('dragStart', hideTooltip);
    network.on('zoom', hideTooltip);

    // ── Orchestrator pulse ─────────────────────────────────────
    var pulseWidth = 2;
    var pulseUp = true;
    setInterval(function () {
      pulseWidth = pulseUp
        ? Math.min(pulseWidth + 0.6, 7)
        : Math.max(pulseWidth - 0.6, 2);
      if (pulseWidth >= 7 || pulseWidth <= 2) pulseUp = !pulseUp;

      nodes.update({
        id: 'orchestrator',
        borderWidth: pulseWidth,
        shadow: {
          enabled: true,
          color: 'rgba(139,92,246,' + (0.20 + (pulseWidth - 2) * 0.07) + ')',
          size: 10 + (pulseWidth - 2) * 4,
          x: 0, y: 0,
        },
      });
    }, 80);

    // ── Dash-flow animation ────────────────────────────────────
    // Only animate dashes AFTER network is fully ready
    network.once('stabilized', function () {
      if (rafId) cancelAnimationFrame(rafId);
      (function animateDashes() {
        dashOffset -= 0.45;
        network.redraw();
        rafId = requestAnimationFrame(animateDashes);
      })();
    });

    // ── Refresh button ─────────────────────────────────────────
    var refreshBtn = document.getElementById('topologyRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        refreshBtn.classList.add('is-spinning');
        syncContainers();
        setTimeout(function () { refreshBtn.classList.remove('is-spinning'); }, 700);
        if (typeof showToast === 'function') showToast('Topology refreshed', 'success');
      });
    }

    // ── First sync + polling ───────────────────────────────────
    syncContainers();
    setInterval(syncContainers, 3000);
  }

  // ── Container sync ──────────────────────────────────────────
  function syncContainers() {
    fetch('/api/containers?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (!result.success || !result.containers) return;

        var activeIds = ['orchestrator'];
        var hasContainers = false;

        result.containers.forEach(function (c) {
          hasContainers = true;
          activeIds.push(c.id);

          var isRunning = c.status === 'running';
          var isStopped = c.status === 'stopped' || c.status === 'exited';

          var bg = isRunning ? '#0C2A3A' : isStopped ? '#2A1A00' : '#2A0A0A';
          var border = isRunning ? '#0284C7' : isStopped ? '#D97706' : '#DC2626';
          var shadowCol = isRunning
            ? 'rgba(14,165,233,0.40)'
            : isStopped
              ? 'rgba(245,158,11,0.35)'
              : 'rgba(239,68,68,0.40)';

          var cLabel = (c.name || 'Unknown')
            .replace(/^\//, '')
            .replace('cloudx-project-', 'Project ')
            .substring(0, 18);

          var payload = {
            id: c.id,
            label: cLabel,
            _status: c.status,
            color: {
              background: bg,
              border: border,
              highlight: { background: bg, border: border },
              hover: { background: bg, border: border },
            },
            shadow: { enabled: true, color: shadowCol, size: 16, x: 0, y: 0 },
          };

          if (nodes.get(c.id)) {
            nodes.update(payload);
          } else {
            nodes.add(payload);
            edges.add({ id: 'edge-' + c.id, from: 'orchestrator', to: c.id });
          }
        });

        // Empty state
        if (!hasContainers) {
          activeIds.push('empty-node');
          if (!nodes.get('empty-node')) {
            nodes.add({
              id: 'empty-node',
              label: 'No containers',
              shape: 'dot',
              size: 10,
              color: { background: '#1E293B', border: '#475569' },
              font: { color: '#64748B' },
            });
            edges.add({ id: 'edge-empty', from: 'orchestrator', to: 'empty-node' });
          }
        }

        // Remove stale nodes
        nodes.getIds().forEach(function (nodeId) {
          if (!activeIds.includes(nodeId)) {
            edges.remove('edge-' + nodeId);
            nodes.remove(nodeId);
          }
        });

        updateNodeCount(nodes.length);
      })
      .catch(function (e) { console.error('[Topology] fetch error:', e); });
  }

  // ── Boot ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof vis !== 'undefined' && vis.Network) {
      waitForVis(initLiveTopology);
      return;
    }

    // Try unpkg first
    var s1 = document.createElement('script');
    s1.src = 'https://unpkg.com/vis-network@9.1.9/dist/vis-network.min.js';
    s1.onload = function () { waitForVis(initLiveTopology); };
    s1.onerror = function () {
      var s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/vis-network@9.1.9/dist/vis-network.min.js';
      s2.onload = function () { waitForVis(initLiveTopology); };
      s2.onerror = function () {
        var c = document.getElementById('topology-network');
        if (c) c.innerHTML =
          '<p style="color:var(--text-tertiary);text-align:center;padding:2rem;font-size:0.85rem">' +
          '<i class="fas fa-exclamation-triangle" style="color:var(--warning);margin-right:0.5rem"></i>' +
          'Network graph unavailable — CDN blocked.</p>';
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });

})();