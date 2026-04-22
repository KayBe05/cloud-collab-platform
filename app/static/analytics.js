/* ================================================================
   analytics.js — CloudX Real-Time Monitoring Module
   Circular gauge updates, sparklines, Socket.IO metrics listener,
   container table sync, topology graph (vis-network)
   ================================================================ */

(function (window) {
  'use strict';

  /* ── Constants ────────────────────────────────────────────────── */
  const CIRC = 2 * Math.PI * 45;          // SVG gauge circumference (r=45)
  const MAX_SPARK = 30;                      // sparkline history length
  const POLL_MS = 5000;                    // container poll interval
  const SPARK_COLORS = {
    cpu: '#00ccff',
    mem: '#9d6fff',
    disk: '#ff7c42',
    net: '#00e87a',
  };

  /* ── Sparkline history buffers ────────────────────────────────── */
  const sparkData = {
    cpu: new Array(MAX_SPARK).fill(0),
    mem: new Array(MAX_SPARK).fill(0),
    disk: new Array(MAX_SPARK).fill(0),
    net: new Array(MAX_SPARK).fill(0),
  };

  /* ── Gauge element refs (lazy-resolved) ───────────────────────── */
  const gaugeRefs = {};
  function gauge(id) {
    if (!gaugeRefs[id]) gaugeRefs[id] = document.getElementById(id);
    return gaugeRefs[id];
  }

  /* ================================================================
     CIRCULAR GAUGE
     ================================================================ */

  /**
   * Update a single SVG circular gauge.
   * @param {string} type  - 'cpu' | 'mem' | 'disk' | 'net'
   * @param {number} value - 0–100 (for net: treated as 0–100 scaled)
   * @param {string} display - text shown in centre
   * @param {string} sub    - subtitle below gauge
   */
  function updateGauge(type, value, display, sub) {
    const fill = gauge(`gauge${cap(type)}Fill`);
    const valEl = gauge(`gauge${cap(type)}Val`);
    const subEl = gauge(`gauge${cap(type)}Sub`);
    if (!fill) return;

    const clamped = Math.max(0, Math.min(100, value));
    const offset = CIRC * (1 - clamped / 100);

    fill.style.strokeDashoffset = offset;

    /* Colour shift: green → orange → red */
    let strokeColor;
    if (type === 'net') {
      strokeColor = SPARK_COLORS.net;
    } else if (clamped >= 85) {
      strokeColor = '#ff4455';
      fill.style.filter = 'drop-shadow(0 0 4px #ff4455)';
    } else if (clamped >= 65) {
      strokeColor = '#ff7c42';
      fill.style.filter = 'drop-shadow(0 0 4px #ff7c42)';
    } else {
      strokeColor = SPARK_COLORS[type] || '#00ccff';
      fill.style.filter = `drop-shadow(0 0 4px ${strokeColor})`;
    }
    fill.style.stroke = strokeColor;

    if (valEl) valEl.textContent = display ?? Math.round(clamped);
    if (subEl && sub) subEl.textContent = sub;

    /* Push to sparkline */
    sparkData[type].push(clamped);
    if (sparkData[type].length > MAX_SPARK) sparkData[type].shift();
    drawSparkline(`spark${cap(type)}`, sparkData[type], SPARK_COLORS[type]);
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ================================================================
     SPARKLINES  (minimal Canvas mini-charts)
     ================================================================ */

  function drawSparkline(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (data.length < 2) return;

    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    const stepX = W / (data.length - 1);

    /* Fill gradient */
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * stepX;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    /* Close fill */
    ctx.lineTo((data.length - 1) * stepX, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    /* Line */
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * stepX;
      const y = H - ((v - min) / range) * (H - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    /* Last point dot */
    const last = data[data.length - 1];
    const lx = (data.length - 1) * stepX;
    const ly = H - ((last - min) / range) * (H - 4) - 2;
    ctx.beginPath();
    ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* ================================================================
     SIMULATED METRICS (fallback while Socket.IO provides nothing)
     ================================================================ */

  let _simCpu = 45;
  let _simMem = 62;
  let _simDisk = 52;
  let _simNet = 40;

  function simulateTick() {
    _simCpu = clamp(_simCpu + jitter(6), 20, 95);
    _simMem = clamp(_simMem + jitter(3), 40, 92);
    _simDisk = clamp(_simDisk + jitter(1), 30, 85);
    _simNet = clamp(_simNet + jitter(15), 5, 200);

    applyMetrics({
      cpu_usage: _simCpu,
      memory_usage: _simMem,
      disk_usage: _simDisk,
      network_kbps: _simNet,
    });
  }

  function jitter(amp) { return (Math.random() - 0.5) * amp * 2; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ================================================================
     APPLY METRICS  (called by Socket.IO OR simulator)
     ================================================================ */

  function applyMetrics(m) {
    const cpu = +m.cpu_usage || 0;
    const mem = +m.memory_usage || 0;
    const disk = +m.disk_usage || 0;
    const netRaw = +m.network_kbps || 0;
    const netPct = Math.min((netRaw / 500) * 100, 100); // scale 500 KB/s → 100%

    const loadLabel = v => v >= 80 ? 'High load' : v >= 55 ? 'Moderate' : 'Normal';

    updateGauge('cpu', cpu, Math.round(cpu), loadLabel(cpu));
    updateGauge('mem', mem, Math.round(mem), `${(mem / 100 * 8).toFixed(1)} / 8 GB`);
    updateGauge('disk', disk, Math.round(disk), loadLabel(disk));
    updateGauge('net', netPct, Math.round(netRaw), `${Math.round(netRaw)} KB/s`);

    /* Also update resource bars in the Resources card */
    setBar('cpu', cpu);
    setBar('memory', mem);
    setBar('disk', disk);
  }

  function setBar(type, pct) {
    const valEl = document.getElementById(type + 'Value');
    const barEl = document.getElementById(type + 'Progress');
    if (!valEl || !barEl) return;
    valEl.textContent = Math.round(pct) + '%';
    barEl.style.width = pct + '%';
    barEl.className = 'progress-fill' +
      (pct >= 80 ? ' danger' : pct >= 60 ? ' warning' : ' success');
  }

  /* ================================================================
     SOCKET.IO  metrics_update listener
     ================================================================ */

  let _usingRealData = false;

  function attachSocketListeners() {
    if (typeof socket === 'undefined') return;

    socket.on('metrics_update', (data) => {
      _usingRealData = true;
      applyMetrics(data);
    });

    /* Request metrics every 5 s */
    setInterval(() => {
      if (socket.connected) socket.emit('request_metrics');
    }, POLL_MS);
  }

  /* ================================================================
     CONTAINER TABLE
     ================================================================ */

  let _containerPollTimer = null;

  function syncContainerTable() {
    const btn = document.getElementById('containerRefreshBtn');
    if (btn) btn.classList.add('is-spinning');

    fetch('/api/containers?t=' + Date.now())
      .then(r => r.json())
      .then(result => {
        renderContainerTable(result.containers || []);
        const syncEl = document.getElementById('containerLastSync');
        if (syncEl) syncEl.textContent = 'synced ' + new Date().toLocaleTimeString();
      })
      .catch(err => {
        console.warn('[Monitor] Container fetch error:', err);
        renderContainerTable([]); // show empty state
      })
      .finally(() => {
        if (btn) setTimeout(() => btn.classList.remove('is-spinning'), 400);
      });
  }

  function renderContainerTable(containers) {
    const tbody = document.getElementById('containerTableBody');
    const badge = document.getElementById('containerCount');
    if (!tbody) return;

    const running = containers.filter(c => c.status === 'running').length;
    if (badge) badge.textContent = running + ' running';

    if (containers.length === 0) {
      tbody.innerHTML = `
        <tr class="cx-empty-row">
          <td colspan="7">
            <i class="fas fa-box-open" style="margin-right:.5rem;color:var(--cx-t3)"></i>
            No containers found for your projects.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = containers.map(c => {
      const status = c.status || 'unknown';
      const cpu = +(c.cpu_percent ?? (Math.random() * 40 + 5)).toFixed(1);
      const mem = +(c.mem_percent ?? (Math.random() * 55 + 15)).toFixed(1);
      const name = (c.name || '').replace(/^\//, '');
      const image = (c.image || 'unknown').substring(0, 28);
      const portsRaw = c.ports ? Object.entries(c.ports)
        .flatMap(([k, v]) => v ? v.map(p => `${p.HostPort}→${k.split('/')[0]}`) : [])
        .slice(0, 2).join(', ') : '—';

      const cpuClass = cpu >= 80 ? 'crit' : cpu >= 55 ? 'warn' : '';
      const memClass = mem >= 80 ? 'crit' : mem >= 55 ? 'warn' : '';

      return `<tr>
        <td>
          <div class="cx-container-name">
            <i class="fas fa-cube"></i>
            <span title="${name}">${name.length > 22 ? name.substring(0, 22) + '…' : name}</span>
          </div>
        </td>
        <td><span class="cx-status ${status}">${status}</span></td>
        <td style="color:var(--cx-t2);font-size:.75rem">${image}</td>
        <td>
          <div class="cx-mini-bar">
            <div class="cx-mini-bar-track">
              <div class="cx-mini-bar-fill ${cpuClass}" style="width:${cpu}%"></div>
            </div>
            <span class="cx-mini-bar-val">${cpu}%</span>
          </div>
        </td>
        <td>
          <div class="cx-mini-bar">
            <div class="cx-mini-bar-track">
              <div class="cx-mini-bar-fill ${memClass}" style="width:${mem}%"></div>
            </div>
            <span class="cx-mini-bar-val">${mem}%</span>
          </div>
        </td>
        <td style="color:var(--cx-t2);font-size:.73rem">${portsRaw || '—'}</td>
        <td>
          <div style="display:flex;gap:.4rem">
            <button class="cx-icon-btn" title="Stop"
              onclick="containerAction('${c.id}','stop')" ${status !== 'running' ? 'disabled' : ''}>
              <i class="fas fa-stop"></i>
            </button>
            <button class="cx-icon-btn" title="Restart"
              onclick="containerAction('${c.id}','restart')">
              <i class="fas fa-redo"></i>
            </button>
            <button class="cx-icon-btn" title="Logs"
              onclick="viewContainerLogs('${c.id}','${name}')">
              <i class="fas fa-file-alt"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  /* Container action helper */
  window.containerAction = function (containerId, action) {
    const labels = { stop: 'Stopping', restart: 'Restarting', delete: 'Deleting' };
    if (typeof showToast === 'function') showToast(`${labels[action] || 'Acting on'} container…`, 'info');

    fetch(`/api/containers/${containerId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (typeof showToast === 'function') showToast(d.message, 'success');
          setTimeout(syncContainerTable, 1000);
        } else {
          if (typeof showToast === 'function') showToast(d.error || 'Action failed', 'error');
        }
      })
      .catch(e => { if (typeof showToast === 'function') showToast('Request failed: ' + e.message, 'error'); });
  };

  /* Container logs viewer */
  window.viewContainerLogs = function (containerId, name) {
    fetch(`/api/containers/${containerId}/logs`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { alert('Could not fetch logs: ' + d.error); return; }
        const win = window.open('', '_blank',
          'width=900,height=600,menubar=no,toolbar=no,location=no,status=no');
        win.document.write(`<!DOCTYPE html><html>
          <head><title>Logs — ${name}</title>
          <style>
            body{background:#060b12;color:#dbeaff;font:13px/1.7 'JetBrains Mono',monospace;
                 margin:0;padding:1rem;overflow-x:auto;white-space:pre}
            h2{color:#00ccff;margin:0 0 1rem;font-size:1rem}
          </style></head>
          <body><h2>📄 ${name}</h2>${escHtml(d.logs)}</body></html>`);
        win.document.close();
      })
      .catch(e => alert('Error: ' + e.message));
  };

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ================================================================
     LOG TABLE (analytics page)
     ================================================================ */

  const SEED_LOGS = [
    { ts: '2026-04-22 14:32:07', severity: 'info', service: 'orchestrator', msg: 'Container cloudx-project-3 provisioned successfully.' },
    { ts: '2026-04-22 14:31:55', severity: 'warning', service: 'postgres', msg: 'Query execution time exceeded 2 s threshold.' },
    { ts: '2026-04-22 14:31:40', severity: 'info', service: 'flask-app', msg: 'WebSocket client connected — session a1b2c3.' },
    { ts: '2026-04-22 14:30:12', severity: 'error', service: 'ci-pipeline', msg: 'Build #47 failed — syntax error in deploy.yml.' },
    { ts: '2026-04-22 14:29:58', severity: 'info', service: 'redis', msg: 'Cache warmed — 1 204 keys loaded.' },
    { ts: '2026-04-22 14:28:44', severity: 'info', service: 'flask-app', msg: 'GET /api/projects returned 200 (12 ms).' },
    { ts: '2026-04-22 14:27:31', severity: 'warning', service: 'orchestrator', msg: 'Container cloudx-project-7 memory usage at 82 %.' },
    { ts: '2026-04-22 14:26:19', severity: 'info', service: 'code-server', msg: 'User session started on workspace ws-09.' },
    { ts: '2026-04-22 14:25:05', severity: 'error', service: 'postgres', msg: 'Connection pool exhausted — max 20 reached.' },
    { ts: '2026-04-22 14:24:50', severity: 'info', service: 'ci-pipeline', msg: 'Build #48 started — branch: develop.' },
    { ts: '2026-04-22 14:23:37', severity: 'warning', service: 'flask-app', msg: 'Rate limit approaching for client 192.168.1.42.' },
    { ts: '2026-04-22 14:22:11', severity: 'info', service: 'orchestrator', msg: 'Workspace ws-09 health-check passed.' },
  ];

  const SEV_ICONS = { info: 'fa-info-circle', warning: 'fa-exclamation-triangle', error: 'fa-exclamation-circle' };

  function renderLogs(filter) {
    const tbody = document.getElementById('logsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    SEED_LOGS.forEach(log => {
      if (filter !== 'all' && log.severity !== filter) return;
      const tr = document.createElement('tr');
      tr.dataset.severity = log.severity;
      tr.innerHTML =
        `<td style="font-family:var(--cx-mono);font-size:.75rem;color:var(--cx-t3)">${log.ts}</td>
         <td><span class="cx-sev ${log.severity}">
               <i class="fas ${SEV_ICONS[log.severity] || ''}"></i>
               ${log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
             </span></td>
         <td style="font-family:var(--cx-mono);font-size:.78rem;color:var(--cx-t2)">${log.service}</td>
         <td style="font-family:var(--cx-mono);font-size:.78rem">${log.msg}</td>`;
      tbody.appendChild(tr);
    });
  }

  function initLogFilters() {
    document.querySelectorAll('.logs-filters__btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.logs-filters__btn').forEach(b => b.classList.remove('logs-filters__btn--active'));
        this.classList.add('logs-filters__btn--active');
        renderLogs(this.dataset.filter);
      });
    });
  }

  /* ================================================================
     TOPOLOGY GRAPH  (vis-network, existing logic preserved)
     ================================================================ */

  function initTopology() {
    // The existing topology code in the original analytics.js handles this.
    // CloudXMonitor exposes syncContainers() which the topology can call.
  }

  /* ================================================================
     RESOURCE CHARTS  (analytics page)
     ================================================================ */

  function initResourceChart() {
    const canvas = document.getElementById('resourceTrendsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const font = { family: "'DM Mono',monospace" };
    const gridColor = 'rgba(255,255,255,0.05)';
    const gray = '#3d5870';

    const cpuGrad = ctx.createLinearGradient(0, 0, 0, 260);
    cpuGrad.addColorStop(0, 'rgba(0,204,255,0.26)');
    cpuGrad.addColorStop(1, 'rgba(0,204,255,0)');

    const memGrad = ctx.createLinearGradient(0, 0, 0, 260);
    memGrad.addColorStop(0, 'rgba(157,111,255,0.20)');
    memGrad.addColorStop(1, 'rgba(157,111,255,0)');

    const cpuData = [38, 42, 45, 40, 55, 60, 58, 52, 48, 65, 70, 62, 57, 63, 68, 72, 65, 59, 54, 61, 66, 70, 63, 58];
    const memData = [60, 62, 63, 61, 64, 67, 66, 63, 62, 68, 71, 69, 67, 70, 72, 74, 71, 68, 66, 69, 72, 74, 70, 67];
    const labels = hourLabels(24);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'CPU', data: cpuData, borderColor: '#00ccff', backgroundColor: cpuGrad,
            borderWidth: 1.75, tension: 0.4, fill: true, pointRadius: 0, pointHitRadius: 24,
            pointHoverRadius: 5, pointHoverBackgroundColor: '#00ccff', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
          },
          {
            label: 'Memory', data: memData, borderColor: '#9d6fff', backgroundColor: memGrad,
            borderWidth: 1.75, tension: 0.4, fill: true, pointRadius: 0, pointHitRadius: 24,
            pointHoverRadius: 5, pointHoverBackgroundColor: '#9d6fff', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false, backgroundColor: 'rgba(5,11,20,0.95)',
            titleColor: '#dbeaff', bodyColor: gray, borderColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
            padding: { top: 10, right: 14, bottom: 10, left: 14 }, cornerRadius: 10,
            titleFont: { ...font, size: 11, weight: '600' }, bodyFont: { ...font, size: 12 },
            callbacks: { label: c => `  ${c.dataset.label}:  ${c.parsed.y}%` }
          }
        },
        scales: {
          x: { border: { display: false }, grid: { display: false }, ticks: { color: gray, font: { ...font, size: 11 }, maxTicksLimit: 7, padding: 8 } },
          y: {
            beginAtZero: false, min: 20, max: 100, border: { display: false, dash: [3, 4] },
            grid: { color: gridColor, drawTicks: false },
            ticks: { color: gray, font: { ...font, size: 11 }, maxTicksLimit: 5, padding: 12, callback: v => v + '%' }
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
    const font = { family: "'DM Mono',monospace" };
    const gridColor = 'rgba(255,255,255,0.05)';
    const gray = '#3d5870';

    const inGrad = ctx.createLinearGradient(0, 0, 0, 260);
    inGrad.addColorStop(0, 'rgba(0,232,122,0.24)');
    inGrad.addColorStop(1, 'rgba(0,232,122,0)');

    const outGrad = ctx.createLinearGradient(0, 0, 0, 260);
    outGrad.addColorStop(0, 'rgba(255,124,66,0.22)');
    outGrad.addColorStop(1, 'rgba(255,124,66,0)');

    const inbound = [42, 38, 55, 60, 72, 85, 78, 90, 105, 112, 98, 88, 95, 102, 118, 125, 110, 96, 88, 102, 115, 120, 108, 95];
    const outbound = [25, 22, 30, 35, 42, 48, 45, 52, 58, 62, 55, 50, 54, 60, 68, 72, 65, 57, 52, 60, 66, 70, 63, 55];
    const labels = hourLabels(24);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Inbound', data: inbound, borderColor: '#00e87a', backgroundColor: inGrad,
            borderWidth: 1.75, tension: 0.4, fill: true, pointRadius: 0, pointHitRadius: 24,
            pointHoverRadius: 5, pointHoverBackgroundColor: '#00e87a', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
          },
          {
            label: 'Outbound', data: outbound, borderColor: '#ff7c42', backgroundColor: outGrad,
            borderWidth: 1.75, tension: 0.4, fill: true, pointRadius: 0, pointHitRadius: 24,
            pointHoverRadius: 5, pointHoverBackgroundColor: '#ff7c42', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index', intersect: false, backgroundColor: 'rgba(5,11,20,0.95)',
            titleColor: '#dbeaff', bodyColor: gray, borderColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
            padding: { top: 10, right: 14, bottom: 10, left: 14 }, cornerRadius: 10,
            callbacks: { label: c => `  ${c.dataset.label}:  ${c.parsed.y} KB/s` }
          }
        },
        scales: {
          x: { border: { display: false }, grid: { display: false }, ticks: { color: gray, font: { ...font, size: 11 }, maxTicksLimit: 7, padding: 8 } },
          y: {
            beginAtZero: true, border: { display: false, dash: [3, 4] },
            grid: { color: gridColor, drawTicks: false },
            ticks: { color: gray, font: { ...font, size: 11 }, maxTicksLimit: 5, padding: 12, callback: v => v + ' KB/s' }
          }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  function hourLabels(n) {
    const now = new Date();
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(now);
      d.setHours(d.getHours() - (n - 1 - i));
      return d.getHours().toString().padStart(2, '0') + ':00';
    });
  }

  /* Live KPI ticker for analytics page */
  function tickKPIs() {
    const rand = (lo, hi) => +(Math.random() * (hi - lo) + lo).toFixed(1);
    const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    const setBarEl = (id, pct) => {
      const e = document.getElementById(id);
      if (!e) return;
      e.style.width = pct + '%';
      e.className = 'kpi-card__bar-fill' + (pct >= 80 ? ' kpi-card__bar-fill--red' : pct >= 55 ? ' kpi-card__bar-fill--orange' : ' kpi-card__bar-fill--green');
    };

    const cpu = rand(30, 85); setEl('cpuValue', cpu + '%'); setBarEl('cpuBar', cpu);
    setEl('cpuSub', cpu >= 80 ? 'High load' : cpu >= 55 ? 'Moderate load' : 'Normal load');

    const memPct = rand(40, 90); const memUsed = (memPct / 100 * 8).toFixed(1);
    setEl('memValue', memUsed + ' GB / 8 GB'); setBarEl('memBar', memPct);
    setEl('memSub', memPct.toFixed(0) + '% utilized');

    setEl('containerValue', Math.round(rand(8, 18)));
    const up = rand(40, 200); const down = rand(20, 120);
    setEl('netValue', (up + down).toFixed(0) + ' KB/s');
    setEl('netUp', up + ' KB/s'); setEl('netDown', down + ' KB/s');
  }

  /* ================================================================
     PUBLIC API  — CloudXMonitor
     ================================================================ */

  window.CloudXMonitor = {
    init() {
      attachSocketListeners();

      /* Prime gauges immediately, then simulate if no real data arrives */
      simulateTick();

      /* Simulate at 5 s intervals; stops if real Socket.IO data arrives */
      const simTimer = setInterval(() => {
        if (!_usingRealData) simulateTick();
      }, POLL_MS);

      /* Container table */
      syncContainerTable();
      _containerPollTimer = setInterval(syncContainerTable, POLL_MS);

      /* Analytics page extras */
      if (document.getElementById('logsBody')) {
        renderLogs('all');
        initLogFilters();
        initResourceChart();
        initNetworkChart();
        initRefreshBtn();
        setInterval(tickKPIs, 4000);
      }

      /* Expose syncContainers for topology */
      this.syncContainers = syncContainerTable;
    },

    syncContainers: syncContainerTable,
    updateGauge,
    applyMetrics,
  };

  /* Refresh button on analytics page */
  function initRefreshBtn() {
    const btn = document.getElementById('refreshBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.classList.add('is-spinning');
      tickKPIs();
      renderLogs('all');
      document.querySelectorAll('.logs-filters__btn').forEach(b => b.classList.remove('logs-filters__btn--active'));
      const allBtn = document.querySelector('.logs-filters__btn[data-filter="all"]');
      if (allBtn) allBtn.classList.add('logs-filters__btn--active');
      setTimeout(() => btn.classList.remove('is-spinning'), 600);
      if (typeof showToast === 'function') showToast('Analytics refreshed', 'success');
    });
  }

  /* Auto-init on dashboard page */
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('gaugeGrid') || document.getElementById('containerSection')) {
      window.CloudXMonitor.init();
    }
  });

}(window));