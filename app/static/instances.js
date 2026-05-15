'use strict';

let term = null;
let fitAddon = null;
let _logViewerState = { containerId: null, containerName: null };

document.addEventListener('DOMContentLoaded', () => {
  loadContainers();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLogViewer();
      closeTerminal();
    }
  });
});

async function loadContainers() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const containerTable = document.getElementById('containerTable');
  const containerTableBody = document.getElementById('containerTableBody');

  loadingState.style.display = 'flex';
  emptyState.style.display = 'none';
  containerTable.style.display = 'none';

  try {
    const response = await fetch('/api/containers');
    const data = await response.json();

    if (!data.success) throw new Error(data.error || 'Failed to fetch containers');

    const containers = data.containers || [];
    loadingState.style.display = 'none';
    updateStats(containers);

    if (containers.length === 0) {
      emptyState.style.display = 'flex';
    } else {
      containerTable.style.display = 'block';
      containerTableBody.innerHTML = '';
      containers.forEach(c => containerTableBody.appendChild(createContainerRow(c)));
    }
  } catch (error) {
    console.error('Error loading containers:', error);
    loadingState.style.display = 'none';
    emptyState.style.display = 'flex';

    emptyState.innerHTML = `
      <div class="empty-state-icon"><i class="fas fa-exclamation-triangle"></i></div>
      <h3 class="empty-state-title">Failed to load containers</h3>
      <p class="empty-state-description">${escapeHtml(error.message)}</p>
      <button class="btn btn-primary btn-large" onclick="loadContainers()">
        <i class="fas fa-sync-alt"></i><span>Retry</span>
      </button>
    `;
  }
}

function updateStats(containers) {
  const runningCount = containers.filter(c => c.status.toLowerCase() === 'running').length;
  const stoppedCount = containers.filter(c => c.status.toLowerCase() === 'exited').length;

  const runningEl = document.getElementById('runningCount');
  const stoppedEl = document.getElementById('stoppedCount');
  if (runningEl) runningEl.textContent = runningCount;
  if (stoppedEl) stoppedEl.textContent = stoppedCount;
}

function createContainerRow(container) {
  const tr = document.createElement('tr');
  const createdDate = new Date(container.created);
  const timeAgo = formatTimeAgo(createdDate);
  const status = container.status.toLowerCase();

  const statusBadgeHtml = buildStatusBadge(status, container.status);

  tr.innerHTML = `
    <td data-label="Container">
      <div class="container-name-cell">
        <div class="container-icon-wrapper"><i class="fas fa-cube"></i></div>
        <div class="container-info">
          <div class="container-name">${escapeHtml(container.name)}</div>
          <div class="container-id">${escapeHtml(container.id)}</div>
        </div>
      </div>
    </td>
    <td data-label="Status">${statusBadgeHtml}</td>
    <td data-label="Image"><span class="image-name">${escapeHtml(container.image)}</span></td>
    <td data-label="Created">
      <span class="created-time"><i class="fas fa-clock"></i> ${timeAgo}</span>
    </td>
    <td data-label="Actions">
      <div class="action-buttons-modern" style="justify-content:flex-end;">
        ${createActionButtons(container)}
      </div>
    </td>
  `;
  return tr;
}

function buildStatusBadge(statusClass, rawStatus) {
  const label = escapeHtml(rawStatus.toUpperCase());
  return `
    <span class="status-badge-modern ${statusClass}">
      <span class="status-dot"></span><span>${label}</span>
    </span>
  `;
}

// Added type="button" and event.preventDefault() to stop page reloading
function createActionButtons(container) {
  const status = container.status.toLowerCase();
  const id = escapeHtml(container.id);
  const name = escapeHtml(container.name);
  let buttons = '';

  if (status === 'running') {
    buttons += `
      <button type="button" class="action-btn-modern terminal-btn"
              onclick="event.preventDefault(); openTerminal('${id}', '${name}')" title="Open Terminal">
        <i class="fas fa-terminal"></i><span>Term</span>
      </button>
    `;
  }

  buttons += `
    <button type="button" class="action-btn-modern"
            onclick="event.preventDefault(); viewLogs('${id}', '${name}')" title="View Logs">
      <i class="fas fa-file-alt"></i><span>Logs</span>
    </button>
  `;

  if (status === 'running') {
    buttons += `
      <button type="button" class="action-btn-modern"
              onclick="event.preventDefault(); containerAction('${id}', 'restart', '${name}', this)" title="Restart">
        <i class="fas fa-sync-alt"></i>
      </button>
      <button type="button" class="action-btn-modern danger"
              onclick="event.preventDefault(); containerAction('${id}', 'stop', '${name}', this)" title="Stop">
        <i class="fas fa-stop"></i>
      </button>
    `;
  } else {
    buttons += `
      <button type="button" class="action-btn-modern success"
              onclick="event.preventDefault(); containerAction('${id}', 'restart', '${name}', this)" title="Start">
        <i class="fas fa-play"></i>
      </button>
      <button type="button" class="action-btn-modern danger"
              onclick="event.preventDefault(); containerAction('${id}', 'delete', '${name}', this)" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    `;
  }
  return buttons;
}

// Dynamic UI confirmation to bypass missing HTML dependencies
function dynamicConfirm(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.3s ease;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 24px; width: 400px; max-width: 90%;
    box-shadow: 0 16px 40px rgba(0,0,0,0.5); text-align: center;
    transform: translateY(20px); transition: transform 0.3s ease;
  `;

  modal.innerHTML = `
    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444; margin-bottom: 16px;"></i>
    <h3 style="margin: 0 0 12px 0; color: #f8fafc; font-family: 'Syne', sans-serif;">${title}</h3>
    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">${message}</p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="dyn-cancel" style="padding: 8px 16px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #f8fafc; cursor: pointer;">Cancel</button>
      <button id="dyn-confirm" style="padding: 8px 16px; border-radius: 6px; border: none; background: #ef4444; color: white; font-weight: bold; cursor: pointer;">Confirm</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'translateY(0)';
  });

  const close = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'translateY(20px)';
    setTimeout(() => overlay.remove(), 300);
  };

  modal.querySelector('#dyn-cancel').onclick = close;
  modal.querySelector('#dyn-confirm').onclick = () => { close(); onConfirm(); };
}

async function containerAction(containerId, action, containerName, buttonElement) {
  if (action === 'delete') {
    dynamicConfirm(
      'Delete Container',
      `Are you sure you want to permanently delete <strong>${containerName}</strong>? This action cannot be undone.`,
      () => _executeContainerAction(containerId, action, containerName, buttonElement)
    );
    return;
  }
  _executeContainerAction(containerId, action, containerName, buttonElement);
}

async function _executeContainerAction(containerId, action, containerName, buttonElement) {
  const originalHTML = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const response = await fetch(`/api/containers/${containerId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Action failed');

    const actionLabels = { start: 'started', stop: 'stopped', restart: 'restarted', delete: 'deleted' };
    showToast(`Container ${actionLabels[action] || action} successfully.`, 'success');

    setTimeout(() => loadContainers(), 900);

  } catch (error) {
    console.error(`Error performing ${action}:`, error);
    showToast(`Failed to ${action} container: ${error.message}`, 'error');
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalHTML;
  }
}

async function viewLogs(containerId, containerName) {
  _logViewerState = { containerId, containerName };

  const overlay = document.getElementById('logViewerOverlay');
  const subtitleEl = document.getElementById('logViewerSubtitle');
  const loadingState = document.getElementById('logLoadingState');
  const errorState = document.getElementById('logErrorState');
  const outputEl = document.getElementById('logOutput');
  const metaEl = document.getElementById('logMeta');

  subtitleEl.textContent = containerName;
  loadingState.style.display = 'flex';
  errorState.style.display = 'none';
  outputEl.style.display = 'none';
  metaEl.textContent = '—';

  // Force display override to bypass CSS class issues
  overlay.style.display = 'flex';
  overlay.classList.add('active', 'visible');
  document.body.style.overflow = 'hidden';

  try {
    const response = await fetch(`/api/containers/${containerId}/logs`);
    const data = await response.json();

    if (!data.success) throw new Error(data.error || 'Failed to fetch logs');

    const rawLogs = data.logs || '(no output)';

    loadingState.style.display = 'none';
    outputEl.style.display = 'block';
    outputEl.textContent = rawLogs;
    outputEl.scrollTop = outputEl.scrollHeight;

    const lineCount = rawLogs.split('\n').length;
    metaEl.textContent = `${lineCount.toLocaleString()} line${lineCount !== 1 ? 's' : ''}`;

  } catch (error) {
    loadingState.style.display = 'none';
    errorState.style.display = 'flex';
    document.getElementById('logErrorText').textContent = error.message;
    showToast(`Failed to load logs: ${error.message}`, 'error');
  }
}

function retryLogFetch() {
  const { containerId, containerName } = _logViewerState;
  if (containerId) viewLogs(containerId, containerName);
}

function closeLogViewer() {
  const overlay = document.getElementById('logViewerOverlay');
  overlay.style.display = 'none';
  overlay.classList.remove('active', 'visible');
  document.body.style.overflow = '';
  _logViewerState = { containerId: null, containerName: null };
}

function copyLogs() {
  const outputEl = document.getElementById('logOutput');
  if (!outputEl || !outputEl.textContent) return;
  navigator.clipboard.writeText(outputEl.textContent)
    .then(() => showToast('Logs copied to clipboard.', 'success'))
    .catch(() => showToast('Could not access clipboard.', 'error'));
}

function downloadLogs() {
  const outputEl = document.getElementById('logOutput');
  if (!outputEl) return;
  const text = outputEl.textContent;
  const name = _logViewerState.containerName || 'container';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_logs_${timestamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openTerminal(containerId, name) {
  const modal = document.getElementById('terminalModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const titleEl = document.getElementById('term-title');
  if (titleEl) titleEl.innerText = `root@${name}`;

  if (term) term.dispose();

  term = new Terminal({
    cursorBlink: true, fontSize: 14, fontFamily: '"JetBrains Mono", monospace',
    theme: { background: '#000000', foreground: '#ffffff', cursor: '#10b981', selection: 'rgba(16, 185, 129, 0.3)' },
  });

  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);

  const container = document.getElementById('terminal-container');
  container.innerHTML = '';
  term.open(container);

  if (typeof socket !== 'undefined') {
    socket.emit('terminal_join', { container_id: containerId });
    term.onData(data => socket.emit('terminal_input', { input: data }));
    socket.off('terminal_output');
    socket.on('terminal_output', data => term.write(data.output));
  } else {
    term.write('\r\n\x1b[31mError: Socket.IO connection not found.\x1b[0m\r\n');
  }

  setTimeout(() => { fitAddon.fit(); term.focus(); }, 200);
  window.addEventListener('resize', () => fitAddon && fitAddon.fit());
}

function closeTerminal() {
  const modal = document.getElementById('terminalModal');
  if (modal) modal.style.display = 'none';
  if (term) { term.dispose(); term = null; }
  if (typeof socket !== 'undefined') socket.off('terminal_output');
}

function showToast(message, type = 'info') {
  if (typeof window.showToast === 'function' && window.showToast !== showToast) {
    window.showToast(message, type);
    return;
  }

  const colours = { success: 'rgba(16,185,129,0.15)', error: 'rgba(239,68,68,0.15)', info: 'rgba(14,165,233,0.15)' };
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const textColours = { success: '#10b981', error: '#ef4444', info: '#38bdf8' };

  const existing = document.querySelectorAll('.cx-toast').length;
  const topOffset = 1.25 + existing * 4.25;

  const toast = document.createElement('div');
  toast.className = 'cx-toast';
  toast.style.cssText = `
    position: fixed; top: ${topOffset}rem; right: 1.25rem; z-index: 9999;
    display: flex; align-items: center; gap: .75rem; padding: .875rem 1.25rem;
    border-radius: 10px; background: ${colours[type] || colours.info};
    backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 8px 32px rgba(0,0,0,.4); font-size: .875rem; font-weight: 600;
    color: ${textColours[type] || textColours.info}; min-width: 260px;
    transform: translateX(calc(100% + 1.5rem)); opacity: 0;
    transition: transform .32s ease, opacity .32s ease;
  `;

  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="font-size:1rem;flex-shrink:0;"></i><span style="flex:1;">${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }));

  setTimeout(() => {
    toast.style.transform = 'translateX(calc(100% + 1.5rem))';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3400);
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

Object.assign(window, {
  loadContainers,
  containerAction,
  viewLogs,
  closeLogViewer,
  retryLogFetch,
  copyLogs,
  downloadLogs,
  openTerminal,
  closeTerminal,
  showToast
});