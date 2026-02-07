/**
 * CloudX Platform - Instances Management
 * JavaScript module for managing Docker containers
 */

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
  loadContainers();
});

// Global variables for logs modal
window.currentContainerId = null;
window.currentContainerName = null;

// ==================== Main Functions ====================

/**
 * Load and display all containers
 */
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

    // Show toast notification
    if (typeof showToast === 'function') {
      showToast('Failed to load containers: ' + error.message, 'error');
    }
  }
}

/**
 * Update stats in header
 * @param {Array} containers - Array of container objects
 */
function updateStats(containers) {
  const runningCount = containers.filter(c => c.status.toLowerCase() === 'running').length;
  const stoppedCount = containers.filter(c => c.status.toLowerCase() === 'exited').length;

  document.getElementById('runningCount').textContent = runningCount;
  document.getElementById('stoppedCount').textContent = stoppedCount;
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
  const statusClass = container.status.toLowerCase();
  const statusIcon = getStatusIcon(container.status);

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
      <span class="status-badge-modern ${statusClass}">
        <i class="fas ${statusIcon}"></i>
        <span>${escapeHtml(container.status)}</span>
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
      <div class="action-buttons-modern">
        ${createActionButtons(container)}
      </div>
    </td>
  `;

  return tr;
}

/**
 * Create action buttons HTML based on container status
 * @param {Object} container - Container data object
 * @returns {string} - HTML string with action buttons
 */
function createActionButtons(container) {
  const status = container.status.toLowerCase();
  let buttons = '';

  // Logs button (always available)
  buttons += `
    <button class="action-btn-modern" onclick="viewLogs('${container.id}', '${escapeHtml(container.name)}')" title="View Logs">
      <i class="fas fa-file-alt"></i>
      <span>Logs</span>
    </button>
  `;

  if (status === 'running') {
    // Stop and Restart for running containers
    buttons += `
      <button class="action-btn-modern" onclick="containerAction('${container.id}', 'stop', this)" title="Stop Container">
        <i class="fas fa-stop"></i>
        <span>Stop</span>
      </button>
      <button class="action-btn-modern" onclick="containerAction('${container.id}', 'restart', this)" title="Restart Container">
        <i class="fas fa-sync-alt"></i>
        <span>Restart</span>
      </button>
    `;
  } else if (status === 'exited' || status === 'paused') {
    // Start and Delete for stopped containers
    buttons += `
      <button class="action-btn-modern success" onclick="containerAction('${container.id}', 'restart', this)" title="Start Container">
        <i class="fas fa-play"></i>
        <span>Start</span>
      </button>
      <button class="action-btn-modern danger" onclick="containerAction('${container.id}', 'delete', this)" title="Delete Container">
        <i class="fas fa-trash"></i>
        <span>Delete</span>
      </button>
    `;
  }

  return buttons;
}

// ==================== Container Actions ====================

/**
 * Perform an action on a container (stop, restart, delete)
 * @param {string} containerId - Container ID
 * @param {string} action - Action to perform
 * @param {HTMLElement} buttonElement - Button element that triggered the action
 */
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

    // Show success toast
    if (typeof showToast === 'function') {
      const actionLabels = {
        'stop': 'stopped',
        'restart': 'restarted',
        'delete': 'deleted'
      };
      showToast(`Container ${actionLabels[action] || action} successfully`, 'success');
    }

    // Reload containers after a short delay
    setTimeout(() => loadContainers(), 1000);

  } catch (error) {
    console.error(`Error performing ${action}:`, error);

    // Show error toast
    if (typeof showToast === 'function') {
      showToast(`Failed to ${action} container: ${error.message}`, 'error');
    }

    // Restore button state
    buttonElement.disabled = false;
    buttonElement.innerHTML = originalHTML;
  }
}

// ==================== Logs Modal ====================

/**
 * View container logs in a modal
 * @param {string} containerId - Container ID
 * @param {string} containerName - Container name for display
 */
async function viewLogs(containerId, containerName) {
  // Store globally for retry functionality
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

/**
 * Close the logs modal
 */
function closeLogsModal() {
  const modal = document.getElementById('logsModal');
  modal.style.display = 'none';

  // Clear global variables
  window.currentContainerId = null;
  window.currentContainerName = null;
}

/**
 * Copy logs to clipboard
 */
function copyLogsToClipboard() {
  const logsContent = document.getElementById('logsContent');
  const text = logsContent.textContent;

  navigator.clipboard.writeText(text).then(() => {
    if (typeof showToast === 'function') {
      showToast('Logs copied to clipboard', 'success');
    }
  }).catch(err => {
    console.error('Failed to copy logs:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to copy logs', 'error');
    }
  });
}

/**
 * Download logs as a text file
 */
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

  if (typeof showToast === 'function') {
    showToast('Logs downloaded successfully', 'success');
  }
}

// ==================== Utility Functions ====================

/**
 * Get Font Awesome icon class for container status
 * @param {string} status - Container status
 * @returns {string} - Font Awesome icon class
 */
function getStatusIcon(status) {
  const icons = {
    'running': 'fa-circle',
    'exited': 'fa-stop-circle',
    'paused': 'fa-pause-circle',
    'restarting': 'fa-sync-alt',
    'created': 'fa-plus-circle',
    'removing': 'fa-minus-circle',
    'dead': 'fa-times-circle'
  };
  return icons[status.toLowerCase()] || 'fa-question-circle';
}

/**
 * Format a date as "time ago" string
 * @param {Date} date - Date object
 * @returns {string} - Formatted time ago string
 */
function formatTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text 
 * @returns {string} 
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// ==================== Event Listeners ====================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLogsModal();
  }
});

window.loadContainers = loadContainers;
window.containerAction = containerAction;
window.viewLogs = viewLogs;
window.closeLogsModal = closeLogsModal;
window.copyLogsToClipboard = copyLogsToClipboard;
window.downloadLogs = downloadLogs;