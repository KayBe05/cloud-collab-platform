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
    const gridColor = 'rgba(226, 232, 240, 0.28)';
    const gray500 = '#64748B';

    const cpuGrad = ctx.createLinearGradient(0, 0, 0, 260);
    cpuGrad.addColorStop(0, 'rgba(14, 165, 233, 0.24)');
    cpuGrad.addColorStop(0.65, 'rgba(14, 165, 233, 0.06)');
    cpuGrad.addColorStop(1, 'rgba(14, 165, 233, 0.00)');

    const memGrad = ctx.createLinearGradient(0, 0, 0, 260);
    memGrad.addColorStop(0, 'rgba(139, 92, 246, 0.20)');
    memGrad.addColorStop(0.65, 'rgba(139, 92, 246, 0.04)');
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
            borderWidth: 1.75,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 20,
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
            borderWidth: 1.75,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 20,
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
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.90)',
            titleColor: '#F1F5F9',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            padding: { top: 10, right: 14, bottom: 10, left: 14 },
            cornerRadius: 10,
            titleFont: { ...font, size: 11, weight: '600' },
            bodyFont: { ...font, size: 12 },
            callbacks: {
              label: (ctx) => `  ${ctx.dataset.label}:  ${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            border: { display: false },
            grid: { display: false },            /* X-axis grid hidden */
            ticks: {
              color: gray500,
              font: { ...font, size: 11 },
              maxTicksLimit: 7,
              padding: 8,
            }
          },
          y: {
            beginAtZero: false,
            min: 20,
            max: 100,
            border: { display: false, dash: [4, 4] },
            grid: { color: gridColor, drawTicks: false },
            ticks: {
              color: gray500,
              font: { ...font, size: 11 },
              maxTicksLimit: 5,
              padding: 12,
              callback: (v) => v + '%',
            }
          }
        },
        interaction: { mode: 'index', intersect: false },
      }
    });
  }

  function initNetworkChart() {
    const canvas = document.getElementById('networkTrafficChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const font = { family: "'Inter', sans-serif" };
    const gridColor = 'rgba(226, 232, 240, 0.28)';
    const gray500 = '#64748B';

    const inGrad = ctx.createLinearGradient(0, 0, 0, 260);
    inGrad.addColorStop(0, 'rgba(16, 185, 129, 0.26)');
    inGrad.addColorStop(0.65, 'rgba(16, 185, 129, 0.05)');
    inGrad.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

    const outGrad = ctx.createLinearGradient(0, 0, 0, 260);
    outGrad.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
    outGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.05)');
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
            borderWidth: 1.75,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 20,
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
            borderWidth: 1.75,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 20,
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
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.90)',
            titleColor: '#F1F5F9',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            padding: { top: 10, right: 14, bottom: 10, left: 14 },
            cornerRadius: 10,
            titleFont: { ...font, size: 11, weight: '600' },
            bodyFont: { ...font, size: 12 },
            callbacks: {
              label: (ctx) => `  ${ctx.dataset.label}:  ${ctx.parsed.y} KB/s`
            }
          }
        },
        scales: {
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: {
              color: gray500,
              font: { ...font, size: 11 },
              maxTicksLimit: 7,
              padding: 8,
            }
          },
          y: {
            beginAtZero: true,
            border: { display: false, dash: [4, 4] },
            grid: { color: gridColor, drawTicks: false },
            ticks: {
              color: gray500,
              font: { ...font, size: 11 },
              maxTicksLimit: 5,
              padding: 12,
              callback: (v) => v + ' KB/s',
            }
          }
        },
        interaction: { mode: 'index', intersect: false },
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

  // ── TOPOLOGY: high-tech dark theme + pulse + animated dashes ──────
  let dashOffset = 0;

  function initLiveTopology() {
    const container = document.getElementById('topology-network');
    if (!container) return;
    if (typeof vis === 'undefined') {
      setTimeout(initLiveTopology, 500);
      return;
    }

    nodes = new vis.DataSet([
      { id: 'orchestrator', label: 'CloudX\nOrchestrator', shape: 'box', color: { background: '#8B5CF6', border: '#7C3AED' }, font: { color: 'white', face: 'DM Sans', size: 16 }, shadow: true }
    ]);
    edges = new vis.DataSet([]);

    const options = {
      nodes: {
        shape: 'dot',
        size: 20,
        font: {
          color: '#CBD5E1',
          face: "'Inter', sans-serif",
          size: 13,
          bold: { face: "'Inter', sans-serif", color: '#F1F5F9' },
        },
        borderWidth: 2,
        borderWidthSelected: 3,
        shadow: {
          enabled: true,
          color: 'rgba(14, 165, 233, 0.35)',
          size: 14,
          x: 0,
          y: 0,
        },
        color: {
          background: '#0EA5E9',
          border: '#0284C7',
          highlight: { background: '#38BDF8', border: '#0EA5E9' },
          hover: { background: '#38BDF8', border: '#0EA5E9' },
        },
      },

      edges: {
        width: 1.5,
        color: {
          color: 'rgba(56, 189, 248, 0.30)',
          highlight: '#38BDF8',
          hover: '#0EA5E9',
        },
        dashes: [6, 5],
        smooth: { type: 'curvedCW', roundness: 0.15 },
        shadow: {
          enabled: true,
          color: 'rgba(14, 165, 233, 0.20)',
          size: 6,
          x: 0,
          y: 0,
        },
        selectionWidth: 2.5,
        hoverWidth: 2,
      },

      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -2800,
          centralGravity: 0.25,
          springLength: 160,
          springConstant: 0.04,
          damping: 0.12,
        },
        stabilization: { iterations: 120, fit: true },
      },

      interaction: {
        hover: true,
        tooltipDelay: 120,
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: false,
      },
    };

    network = new vis.Network(container, { nodes, edges }, options);

    // ── Orchestrator pulse ─────────
    let pulseUp = true;
    let pulseWidth = 2;
    setInterval(function () {
      pulseWidth = pulseUp
        ? Math.min(pulseWidth + 0.5, 6)
        : Math.max(pulseWidth - 0.5, 2);
      if (pulseWidth >= 6 || pulseWidth <= 2) pulseUp = !pulseUp;

      nodes.update({
        id: 'orchestrator',
        borderWidth: pulseWidth,
        shadow: {
          enabled: true,
          color: `rgba(139, 92, 246, ${0.20 + (pulseWidth - 2) * 0.08})`,
          size: 8 + (pulseWidth - 2) * 3,
          x: 0, y: 0,
        },
      });
    }, 80);

    // ── Dash-flow animation ─────────
    (function animateDashes() {
      dashOffset -= 0.4;
      network.setOptions({
        edges: { dashes: [6, 5, dashOffset] }
      });
      requestAnimationFrame(animateDashes);
    })();

    // Existing sync loop
    syncContainers();
    setInterval(syncContainers, 3000);
  }

  function syncContainers() {
    const cacheBuster = new Date().getTime();
    fetch('/api/containers?t=' + cacheBuster)
      .then(r => r.json())
      .then(result => {
        if (!result.success || !result.containers) return;

        const activeIds = ['orchestrator'];
        let hasContainers = false;

        result.containers.forEach(c => {
          hasContainers = true;
          activeIds.push(c.id);
          const isRunning = c.status === 'running';
          const nodeColor = isRunning ? '#0EA5E9' : '#F59E0B';
          const borderColor = isRunning ? '#0284C7' : '#D97706';

          let cName = (c.name || 'Unknown').replace(/^\//, '').replace('cloudx-project-', 'Project ').substring(0, 18);

          if (nodes.get(c.id)) {
            nodes.update({ id: c.id, label: cName, title: `Status: ${c.status.toUpperCase()}`, color: { background: nodeColor, border: borderColor } });
          } else {
            nodes.add({ id: c.id, label: cName, title: `Status: ${c.status.toUpperCase()}`, color: { background: nodeColor, border: borderColor } });
            edges.add({ id: `edge-${c.id}`, from: 'orchestrator', to: c.id });
          }
        });

        if (!hasContainers) {
          activeIds.push('empty-node');
          if (!nodes.get('empty-node')) {
            nodes.add({ id: 'empty-node', label: 'API returned\n0 containers', shape: 'dot', size: 12, color: { background: '#334155', border: '#475569' } });
            edges.add({ id: 'edge-empty', from: 'orchestrator', to: 'empty-node', dashes: true });
          }
        }

        nodes.getIds().forEach(nodeId => {
          if (!activeIds.includes(nodeId)) {
            nodes.remove(nodeId);
          }
        });
      })
      .catch(e => console.error("Fetch Error:", e));
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initLiveTopology, 500);
  });
})();