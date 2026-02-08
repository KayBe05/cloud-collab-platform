let term;
let fitAddon;
let currentSocket = null;

window.currentContainerId = null;
window.currentContainerName = null;

document.addEventListener('DOMContentLoaded', () => {
  loadContainers();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLogsModal();
      closeTerminal();
    }
  });
});


// ==================== Main Functions ====================

async function loadContainers() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const containerTable = document.getElementById('containerTable');
  const containerTableBody = document.getElementById('containerTableBody');

  // Show loading state
  loadingState.style.display = 'flex';
  emptyState.style.display = 'none';
  containerTable.style.display = 'none';

  try {
    const response = await fetch('/api/containers');
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch containers');
    }

    const containers = data.containers || [];

    // Hide loading state
    loadingState.style.display = 'none';

    // Update stats
    updateStats(containers);

    if (containers.length === 0) {
      // Show empty state
      emptyState.style.display = 'flex';
    } else {
      // Show table and populate rows
      containerTable.style.display = 'block';
      containerTableBody.innerHTML = '';

      containers.forEach(container => {
        const row = createContainerRow(container);
        containerTableBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error loading containers:', error);
    loadingState.style.display = 'none';
    emptyState.style.display = 'flex';

    // Update empty state to show error
    emptyState.innerHTML = `
      <div class="empty-state-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h3 class="empty-state-title">Failed to load containers</h3>
      <p class="empty-state-description">${escapeHtml(error.message)}</p>
      <button class="btn btn-primary btn-large" onclick="loadContainers()">
        <i class="fas fa-sync-alt"></i>
        <span>Retry</span>
      </button>
    `;
  }
}

/**
 * Update stats in header
 * @param {Array} containers - Array of container objects
 */
function updateStats(containers) {
  const runningCount = containers.filter(c => c.status.toLowerCase() === 'running').length;
  const stoppedCount = containers.filter(c => c.status.toLowerCase() === 'exited').length;

  const runningEl = document.getElementById('runningCount');
  const stoppedEl = document.getElementById('stoppedCount');

  if (runningEl) runningEl.textContent = runningCount;
  if (stoppedEl) stoppedEl.textContent = stoppedCount;
}

// ==================== Container Row Creation ====================

/**
 * Create a table row for a container
 * @param {Object} container - Container data object
 * @returns {HTMLTableRowElement} - Table row element
 */
function createContainerRow(container) {
  const tr = document.createElement('tr');

  // Format created date
  const createdDate = new Date(container.created);
  const timeAgo = formatTimeAgo(createdDate);

  // Determine status badge class and icon
  const status = container.status.toLowerCase();
  const statusClass = status === 'running' ? 'status-running' : 'status-stopped';

  // Icon logic
  let statusIconClass = 'fa-question-circle';
  if (status === 'running') statusIconClass = 'fa-circle';
  else if (status === 'exited') statusIconClass = 'fa-stop-circle';

  // Create row HTML with modern design
  tr.innerHTML = `
    <td data-label="Container">
      <div class="container-name-cell">
        <div class="container-icon-wrapper">
          <i class="fas fa-cube"></i>
        </div>
        <div class="container-info">
          <div class="container-name">${escapeHtml(container.name)}</div>
          <div class="container-id">${escapeHtml(container.id)}</div>
        </div>
      </div>
    </td>
    <td data-label="Status">
      <span class="status-badge ${status === 'running' ? 'success' : 'danger'}">
        <i class="fas ${statusIconClass}"></i>
        <span>${escapeHtml(container.status.toUpperCase())}</span>
      </span>
    </td>
    <td data-label="Image">
      <span class="image-name">${escapeHtml(container.image)}</span>
    </td>
    <td data-label="Created">
      <span class="created-time">
        <i class="fas fa-clock"></i>
        ${timeAgo}
      </span>
    </td>
    <td data-label="Actions">
      <div class="action-buttons-modern" style="justify-content: flex-end;">
        ${createActionButtons(container)}
      </div>
    </td>
  `;

  return tr;
}

/**
 * Create action buttons HTML based on container status
 * @param {Object} container
 * @returns {string} 
 */
function createActionButtons(container) {
  const status = container.status.toLowerCase();
  let buttons = '';

  // 1. TERMINAL BUTTON (Only for running containers)
  if (status === 'running') {
    buttons += `
      <button class="action-btn-modern terminal-btn" onclick="openTerminal('${container.id}', '${escapeHtml(container.name)}')" title="Open Terminal" style="color: #10b981; border-color: #10b981;">
        <i class="fas fa-terminal"></i>
        <span>Term</span>
      </button>
    `;
  }

  // 2. LOGS BUTTON (Always available)
  buttons += `
    <button class="action-btn-modern" onclick="viewLogs('${container.id}', '${escapeHtml(container.name)}')" title="View Logs">
      <i class="fas fa-file-alt"></i>
    </button>
  `;

  // 3. CONTROL BUTTONS
  if (status === 'running') {
    buttons += `
      <button class="action-btn-modern" onclick="containerAction('${container.id}', 'restart', this)" title="Restart">
        <i class="fas fa-sync-alt"></i>
      </button>
      <button class="action-btn-modern danger" onclick="containerAction('${container.id}', 'stop', this)" title="Stop">
        <i class="fas fa-stop"></i>
      </button>
    `;
  } else {
    buttons += `
      <button class="action-btn-modern success" onclick="containerAction('${container.id}', 'restart', this)" title="Start">
        <i class="fas fa-play"></i>
      </button>
      <button class="action-btn-modern danger" onclick="containerAction('${container.id}', 'delete', this)" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    `;
  }

  return buttons;
}

// ==================== Container Actions ====================

async function containerAction(containerId, action, buttonElement) {
  const originalHTML = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const response = await fetch(`/api/containers/${containerId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Action failed');
    }

    setTimeout(() => loadContainers(), 1000);

  } catch (error) {
    console.error(`Error performing ${action}:`, error);
    alert(`Failed to ${action} container: ${error.message}`);

    buttonElement.disabled = false;
    buttonElement.innerHTML = originalHTML;
  }
}

// ==================== TERMINAL LOGIC ====================

function openTerminal(containerId, name) {
  const modal = document.getElementById('terminalModal');
  if (!modal) {
    console.error("Terminal modal not found!");
    return;
  }
  modal.style.display = 'flex';

  const titleEl = document.getElementById('term-title');
  if (titleEl) titleEl.innerText = `root@${name}`;

  if (term) {
    term.dispose(); 
  }

  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: '"JetBrains Mono", monospace',
    theme: {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#10b981',
      selection: 'rgba(16, 185, 129, 0.3)'
    }
  });

  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);

  const container = document.getElementById('terminal-container');
  container.innerHTML = ''; 
  term.open(container);


  if (typeof socket !== 'undefined') {
    socket.emit('terminal_join', { container_id: containerId });

    term.onData(data => {
      socket.emit('terminal_input', { input: data });
    });

    socket.off('terminal_output');
    socket.on('terminal_output', data => {
      term.write(data.output);
    });
  } else {
    term.write('\r\n\x1b[31mError: Socket.IO connection not found.\x1b[0m\r\n');
  }

  setTimeout(() => {
    fitAddon.fit();
    term.focus();
  }, 200);

  window.addEventListener('resize', () => fitAddon.fit());
}

function closeTerminal() {
  const modal = document.getElementById('terminalModal');
  if (modal) modal.style.display = 'none';

  if (term) {
    term.dispose();
    term = null;
  }
  if (typeof socket !== 'undefined') {
    socket.off('terminal_output');
  }
}

// ==================== Logs Modal ====================

async function viewLogs(containerId, containerName) {
  window.currentContainerId = containerId;
  window.currentContainerName = containerName;

  const modal = document.getElementById('logsModal');
  const logsContainerName = document.getElementById('logsContainerName');
  const logsLoadingState = document.getElementById('logsLoadingState');
  const logsContentWrapper = document.getElementById('logsContentWrapper');
  const logsContent = document.getElementById('logsContent');
  const logsErrorState = document.getElementById('logsErrorState');

  // Show modal with loading state
  modal.style.display = 'flex';
  logsContainerName.textContent = containerName;
  logsLoadingState.style.display = 'flex';
  logsContentWrapper.style.display = 'none';
  logsErrorState.style.display = 'none';

  try {
    const response = await fetch(`/api/containers/${containerId}/logs`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch logs');
    }

    // Display logs
    logsLoadingState.style.display = 'none';
    logsContentWrapper.style.display = 'flex';
    logsContent.textContent = data.logs || 'No logs available';

  } catch (error) {
    console.error('Error fetching logs:', error);
    logsLoadingState.style.display = 'none';
    logsErrorState.style.display = 'flex';
    logsErrorState.querySelector('.error-text').textContent = error.message;
  }
}

function closeLogsModal() {
  const modal = document.getElementById('logsModal');
  modal.style.display = 'none';
  window.currentContainerId = null;
  window.currentContainerName = null;
}

function copyLogsToClipboard() {
  const logsContent = document.getElementById('logsContent');
  const text = logsContent.textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert('Logs copied to clipboard');
  });
}

function downloadLogs() {
  const logsContent = document.getElementById('logsContent');
  const text = logsContent.textContent;
  const containerName = window.currentContainerName || 'container';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${containerName}_logs_${timestamp}.txt`;

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== Utility Functions ====================

function formatTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

window.loadContainers = loadContainers;
window.containerAction = containerAction;
window.viewLogs = viewLogs;
window.closeLogsModal = closeLogsModal;
window.copyLogsToClipboard = copyLogsToClipboard;
window.downloadLogs = downloadLogs;
window.openTerminal = openTerminal;
window.closeTerminal = closeTerminal;