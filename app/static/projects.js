class ProjectWizard {
  constructor() {
    // Wizard state
    this.currentStep = 1;
    this.totalSteps = 4;

    // Project data
    this.projectData = {
      gitProvider: null,
      name: '',
      repositoryUrl: '',
      description: '',
      framework: 'nodejs',
      envVars: []
    };

    // DOM elements
    this.modal = null;
    this.stepSections = [];
    this.stepIndicators = [];

    // Validation rules
    this.validationRules = {
      1: () => this.validateStep1(),
      2: () => this.validateStep2(),
      3: () => true, // Environment variables are optional
      4: () => true  // Review step
    };

    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Cache DOM elements
    this.modal = document.getElementById('wizardModal');
    this.stepSections = document.querySelectorAll('.step-section');
    this.stepIndicators = document.querySelectorAll('.wizard-step');

    // Wizard navigation
    document.getElementById('btnNext')?.addEventListener('click', () => this.nextStep());
    document.getElementById('btnBack')?.addEventListener('click', () => this.previousStep());
    document.getElementById('btnSubmit')?.addEventListener('click', () => this.submitProject());

    // Close modal
    document.getElementById('closeWizard')?.addEventListener('click', () => this.closeModal());
    document.querySelector('.wizard-overlay')?.addEventListener('click', () => this.closeModal());

    // Step indicators (allow clicking to jump between steps)
    this.stepIndicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        const targetStep = index + 1;
        if (targetStep < this.currentStep || this.canNavigateToStep(targetStep)) {
          this.goToStep(targetStep);
        }
      });
    });

    // Git provider selection
    document.querySelectorAll('.git-provider-card').forEach(card => {
      card.addEventListener('click', (e) => this.selectGitProvider(e.currentTarget));
    });

    // Framework selection
    document.querySelectorAll('.framework-card').forEach(card => {
      card.addEventListener('click', (e) => this.selectFramework(e.currentTarget));
    });

    // Form inputs
    document.getElementById('projectName')?.addEventListener('input', (e) => {
      this.projectData.name = e.target.value.trim();
      this.updateNextButtonState();
    });

    document.getElementById('repositoryUrl')?.addEventListener('input', (e) => {
      this.projectData.repositoryUrl = e.target.value.trim();
      this.updateNextButtonState();
    });

    document.getElementById('projectDescription')?.addEventListener('input', (e) => {
      this.projectData.description = e.target.value.trim();
    });

    // Environment variables
    document.getElementById('btnAddEnv')?.addEventListener('click', () => this.addEnvVar());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.modal || this.modal.style.display === 'none') return;

      if (e.key === 'Escape') {
        this.closeModal();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        if (this.currentStep < this.totalSteps) {
          this.nextStep();
        } else {
          this.submitProject();
        }
      }
    });
  }

  openModal() {
    if (!this.modal) {
      console.error('Wizard modal not found');
      return;
    }

    // Reset wizard state
    this.currentStep = 1;
    this.projectData = {
      gitProvider: null,
      name: '',
      repositoryUrl: '',
      description: '',
      framework: 'nodejs',
      envVars: []
    };

    // Reset form
    document.getElementById('projectName').value = '';
    document.getElementById('repositoryUrl').value = '';
    document.getElementById('projectDescription').value = '';

    // Clear selections
    document.querySelectorAll('.git-provider-card').forEach(card =>
      card.classList.remove('selected')
    );
    document.querySelectorAll('.framework-card').forEach(card =>
      card.classList.remove('selected')
    );

    // Select default framework
    const defaultFramework = document.querySelector('[data-framework="nodejs"]');
    if (defaultFramework) {
      defaultFramework.classList.add('selected');
    }

    // Clear environment variables
    this.projectData.envVars = [];
    this.renderEnvVars();

    // Show modal
    this.modal.style.display = 'flex';
    setTimeout(() => this.modal.classList.add('show'), 10);

    // Go to first step
    this.goToStep(1);

    // Focus first input
    setTimeout(() => document.getElementById('projectName')?.focus(), 300);
  }

  closeModal() {
    if (!this.modal) return;

    this.modal.classList.remove('show');
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;

    this.currentStep = step;
    this.updateStepUI();
    this.updateProgressBar();
    this.updateNavigationButtons();
  }

  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  canNavigateToStep(targetStep) {
    // Can navigate backward freely
    if (targetStep <= this.currentStep) return true;

    // Can navigate forward only if all previous steps are valid
    for (let step = 1; step < targetStep; step++) {
      if (!this.validationRules[step]()) return false;
    }
    return true;
  }

  updateStepUI() {
    // Update step sections
    this.stepSections.forEach((section, index) => {
      if (index + 1 === this.currentStep) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Update step indicators
    this.stepIndicators.forEach((indicator, index) => {
      const stepNum = index + 1;

      if (stepNum === this.currentStep) {
        indicator.classList.add('active');
        indicator.classList.remove('completed');
      } else if (stepNum < this.currentStep) {
        indicator.classList.add('completed');
        indicator.classList.remove('active');

        // Update indicator to show checkmark
        const stepIndicator = indicator.querySelector('.step-indicator');
        if (stepIndicator && !stepIndicator.querySelector('.fa-check')) {
          stepIndicator.innerHTML = '<i class="fas fa-check"></i>';
        }
      } else {
        indicator.classList.remove('active', 'completed');

        // Reset indicator to show number
        const stepIndicator = indicator.querySelector('.step-indicator');
        if (stepIndicator) {
          stepIndicator.textContent = stepNum;
        }
      }
    });

    // Update review section if on step 4
    if (this.currentStep === 4) {
      this.updateReviewSection();
    }
  }

  updateProgressBar() {
    const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
    const progressFill = document.querySelector('.progress-fill-mini');
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    const progressText = document.querySelector('.wizard-progress span:last-child');
    if (progressText) {
      progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }
  }

  updateNavigationButtons() {
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const btnSubmit = document.getElementById('btnSubmit');

    if (!btnBack || !btnNext || !btnSubmit) return;

    // Back button
    if (this.currentStep === 1) {
      btnBack.style.display = 'none';
    } else {
      btnBack.style.display = 'inline-flex';
    }

    // Next/Submit buttons
    if (this.currentStep === this.totalSteps) {
      btnNext.style.display = 'none';
      btnSubmit.style.display = 'inline-flex';
    } else {
      btnNext.style.display = 'inline-flex';
      btnSubmit.style.display = 'none';
      this.updateNextButtonState();
    }
  }

  updateNextButtonState() {
    const btnNext = document.getElementById('btnNext');
    if (!btnNext) return;

    const isValid = this.validateCurrentStep();
    btnNext.disabled = !isValid;
  }

  validateCurrentStep() {
    const validator = this.validationRules[this.currentStep];
    return validator ? validator() : true;
  }

  validateStep1() {
    return this.projectData.name.length > 0 &&
      this.projectData.repositoryUrl.length > 0;
  }

  validateStep2() {
    return this.projectData.framework !== null;
  }

  selectGitProvider(card) {
    // Remove selection from all cards
    document.querySelectorAll('.git-provider-card').forEach(c =>
      c.classList.remove('selected')
    );

    // Select clicked card
    card.classList.add('selected');
    this.projectData.gitProvider = card.dataset.provider;
  }

  selectFramework(card) {
    // Remove selection from all cards
    document.querySelectorAll('.framework-card').forEach(c =>
      c.classList.remove('selected')
    );

    // Select clicked card
    card.classList.add('selected');
    this.projectData.framework = card.dataset.framework;
  }

  addEnvVar(key = '', value = '') {
    const id = Date.now() + Math.random();
    this.projectData.envVars.push({ id, key, value });
    this.renderEnvVars();
  }

  removeEnvVar(id) {
    this.projectData.envVars = this.projectData.envVars.filter(v => v.id !== id);
    this.renderEnvVars();
  }

  updateEnvVar(id, field, value) {
    const envVar = this.projectData.envVars.find(v => v.id === id);
    if (envVar) {
      envVar[field] = value;
    }
  }

  renderEnvVars() {
    const container = document.getElementById('envVarsContainer');
    const emptyState = document.getElementById('envEmptyState');

    if (!container) return;

    // Clear container
    container.innerHTML = '';

    if (this.projectData.envVars.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Render each environment variable
    this.projectData.envVars.forEach(envVar => {
      const row = document.createElement('div');
      row.className = 'env-var-row';
      row.innerHTML = `
        <div class="env-var-group">
          <label class="env-var-label">Key</label>
          <input 
            type="text" 
            class="env-var-input" 
            placeholder="DATABASE_URL"
            value="${this.escapeHtml(envVar.key)}"
            data-id="${envVar.id}"
            data-field="key"
          >
        </div>
        <div class="env-var-group">
          <label class="env-var-label">Value</label>
          <input 
            type="text" 
            class="env-var-input" 
            placeholder="postgres://..."
            value="${this.escapeHtml(envVar.value)}"
            data-id="${envVar.id}"
            data-field="value"
          >
        </div>
        <button class="btn-remove-env" data-id="${envVar.id}" title="Remove variable">
          <i class="fas fa-trash"></i>
        </button>
      `;

      // Add event listeners
      row.querySelectorAll('.env-var-input').forEach(input => {
        input.addEventListener('input', (e) => {
          this.updateEnvVar(
            parseFloat(e.target.dataset.id),
            e.target.dataset.field,
            e.target.value
          );
        });
      });

      row.querySelector('.btn-remove-env').addEventListener('click', (e) => {
        this.removeEnvVar(parseFloat(e.target.dataset.id));
      });

      container.appendChild(row);
    });
  }

  updateReviewSection() {
    // Update project details
    document.getElementById('reviewProjectName').textContent =
      this.projectData.name || 'Not specified';
    document.getElementById('reviewRepoUrl').textContent =
      this.projectData.repositoryUrl || 'Not specified';
    document.getElementById('reviewDescription').textContent =
      this.projectData.description || 'No description provided';

    // Update git provider
    const gitProviderName = this.projectData.gitProvider
      ? this.projectData.gitProvider.charAt(0).toUpperCase() + this.projectData.gitProvider.slice(1)
      : 'Not selected';
    document.getElementById('reviewGitProvider').textContent = gitProviderName;

    // Update framework
    const frameworkCard = document.querySelector(`.framework-card[data-framework="${this.projectData.framework}"]`);
    const frameworkName = frameworkCard
      ? frameworkCard.querySelector('h4').textContent
      : 'Not selected';
    document.getElementById('reviewFramework').textContent = frameworkName;

    // Update environment variables
    const envContainer = document.getElementById('reviewEnvVars');
    if (!envContainer) return;

    if (this.projectData.envVars.length === 0) {
      envContainer.innerHTML = '<div class="review-no-env"><i class="fas fa-info-circle"></i> No environment variables configured</div>';
    } else {
      envContainer.innerHTML = this.projectData.envVars.map(envVar => `
        <div class="review-env-item">
          <div class="review-env-key">${this.escapeHtml(envVar.key)}</div>
          <div class="review-env-value">${this.escapeHtml(envVar.value)}</div>
        </div>
      `).join('');
    }
  }

  async submitProject() {
    const btnSubmit = document.getElementById('btnSubmit');
    const loadingOverlay = document.querySelector('.wizard-loading');

    if (!btnSubmit || !loadingOverlay) return;

    // Show loading state
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Project...';
    loadingOverlay.classList.add('active');

    try {
      // Prepare payload
      const payload = {
        name: this.projectData.name,
        repository_url: this.projectData.repositoryUrl,
        description: this.projectData.description,
        tags: this.projectData.framework
      };

      // Add environment variables to description if present
      if (this.projectData.envVars.length > 0) {
        const envVarsText = this.projectData.envVars
          .map(v => `${v.key}=${v.value}`)
          .join(', ');
        payload.description += `\n\nEnvironment Variables: ${envVarsText}`;
      }

      // Make API request
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // Success!
        showToast('Project created successfully! Redirecting...', 'success');

        // Close modal and reload page after short delay
        setTimeout(() => {
          this.closeModal();
          window.location.reload();
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      showToast('Failed to create project: ' + error.message, 'error');

      // Reset button state
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fas fa-rocket"></i> Create Project';
      loadingOverlay.classList.remove('active');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Deployment History Manager
 */
class DeploymentHistory {
  constructor() {
    this.modal = null;
    this.currentProjectId = null;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    this.modal = document.getElementById('deploymentModal');

    // Close modal
    document.getElementById('closeDeployment')?.addEventListener('click', () => this.closeModal());
    document.querySelector('.deployment-overlay')?.addEventListener('click', () => this.closeModal());

    // Redeploy button
    document.getElementById('btnRedeploy')?.addEventListener('click', () => this.triggerRedeploy());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.modal || !this.modal.classList.contains('show')) return;
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  async openModal(projectId) {
    if (!this.modal) {
      console.error('Deployment modal not found');
      return;
    }

    this.currentProjectId = projectId;

    // Show modal
    this.modal.style.display = 'flex';
    setTimeout(() => this.modal.classList.add('show'), 10);

    // Load deployment history
    await this.loadDeployments();
  }

  closeModal() {
    if (!this.modal) return;

    this.modal.classList.remove('show');
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  async loadDeployments() {
    const timelineContainer = document.getElementById('deploymentTimeline');
    if (!timelineContainer) return;

    // Show loading state
    timelineContainer.innerHTML = `
      <div class="timeline-empty">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading deployment history...</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/projects/${this.currentProjectId}/deployments`);
      const data = await response.json();

      if (data.success && data.deployments.length > 0) {
        this.renderTimeline(data.deployments);
      } else {
        timelineContainer.innerHTML = `
          <div class="timeline-empty">
            <i class="fas fa-inbox"></i>
            <p>No deployments yet. Click "Redeploy Now" to create your first deployment!</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading deployments:', error);
      timelineContainer.innerHTML = `
        <div class="timeline-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load deployment history</p>
        </div>
      `;
    }
  }

  renderTimeline(deployments) {
    const timelineContainer = document.getElementById('deploymentTimeline');
    if (!timelineContainer) return;

    const timelineHTML = deployments.map(deployment => {
      const timestamp = this.formatTimestamp(deployment.deployed_at);
      const statusClass = deployment.status.toLowerCase();

      return `
        <div class="timeline-item">
          <div class="timeline-dot ${statusClass}"></div>
          <div class="timeline-time">${timestamp}</div>
          <div class="timeline-content">
            <div class="timeline-header">
              <div class="timeline-version">${deployment.version || 'Unknown'}</div>
              <span class="timeline-status ${statusClass}">${deployment.status}</span>
            </div>
            <div class="timeline-details">
              <div class="timeline-detail">
                <div class="timeline-detail-label">Commit</div>
                <div class="timeline-detail-value">${deployment.commit_hash || 'N/A'}</div>
              </div>
              <div class="timeline-detail">
                <div class="timeline-detail-label">Environment</div>
                <div class="timeline-detail-value">${deployment.environment || 'production'}</div>
              </div>
              <div class="timeline-detail">
                <div class="timeline-detail-label">Deployed By</div>
                <div class="timeline-detail-value">${deployment.deployed_by || 'System'}</div>
              </div>
              <div class="timeline-detail">
                <div class="timeline-detail-label">Duration</div>
                <div class="timeline-detail-value">${this.formatDuration(deployment.duration_ms)}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    timelineContainer.innerHTML = `<div class="timeline">${timelineHTML}</div>`;
  }

  async triggerRedeploy() {
    const btnRedeploy = document.getElementById('btnRedeploy');
    if (!btnRedeploy) return;

    // Disable button and show loading state
    const originalText = btnRedeploy.innerHTML;
    btnRedeploy.disabled = true;
    btnRedeploy.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Building...';

    try {
      // Simulate 2-second build delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Trigger redeploy API
      const response = await fetch('/api/deployments/redeploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: this.currentProjectId
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Deployment completed successfully!', 'success');

        // Reload deployment history
        await this.loadDeployments();

        // Reset button
        btnRedeploy.disabled = false;
        btnRedeploy.innerHTML = originalText;
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Error redeploying:', error);
      showToast('Deployment failed: ' + error.message, 'error');

      // Reset button
      btnRedeploy.disabled = false;
      btnRedeploy.innerHTML = originalText;
    }
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDuration(durationMs) {
    if (!durationMs) return 'N/A';

    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

/**
 * Project Deletion with Confirmation
 */
async function deleteProject(projectId, projectName) {
  // Show confirmation dialog
  const confirmed = confirm(
    `Are you sure you want to delete "${projectName}"?\n\n` +
    `This will permanently delete the project and all its deployments.\n` +
    `This action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  // Find the project card element
  const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);

  if (projectCard) {
    // Show loading state on the card
    projectCard.style.opacity = '0.5';
    projectCard.style.pointerEvents = 'none';
  }

  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      // Show success message
      showToast(`Project "${projectName}" deleted successfully`, 'success');

      // Animate card removal
      if (projectCard) {
        projectCard.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        projectCard.style.transform = 'scale(0.9)';
        projectCard.style.opacity = '0';

        setTimeout(() => {
          projectCard.remove();

          // Check if no projects remain
          const remainingCards = document.querySelectorAll('.project-card').length;
          if (remainingCards === 0) {
            // Reload page to show empty state
            window.location.reload();
          }
        }, 400);
      } else {
        // If card not found, just reload
        setTimeout(() => window.location.reload(), 1000);
      }
    } else {
      throw new Error(data.error || 'Failed to delete project');
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    showToast(`Failed to delete project: ${error.message}`, 'error');

    // Restore card state
    if (projectCard) {
      projectCard.style.opacity = '1';
      projectCard.style.pointerEvents = 'auto';
    }
  }
}

// Launch environment function
async function launchEnvironment(projectId, btnElement) {
  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Provisioning...';
  btnElement.disabled = true;

  try {
    const response = await fetch(`/api/projects/${projectId}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      btnElement.innerHTML = '<i class="fas fa-check-circle"></i> Running';
      btnElement.classList.add('btn-success-state');

      const box = document.getElementById(`connection-info-${projectId}`);
      box.style.display = 'block';

      box.querySelector('.password-field').textContent = data.connection.password;
      box.querySelector('.web-link').href = data.connection.web_url;
      box.querySelector('.ssh-command').value = data.connection.ssh_command;

      showToast('Environment provisioned successfully!', 'success');
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error(error);
    btnElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
    btnElement.classList.add('btn-error-state');
    showToast('Launch failed: ' + error.message, 'error');
  }
}

// Copy password
function copyPassword(btn) {
  const password = btn.parentElement.querySelector('.password-field').textContent;
  navigator.clipboard.writeText(password).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.style.color = 'var(--success)';
    showToast('Password copied to clipboard', 'success');
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.color = '';
    }, 2000);
  }).catch(err => {
    showToast('Failed to copy password', 'error');
  });
}

// Copy SSH command
function copySSH(btn) {
  const command = btn.nextElementSibling.value;
  navigator.clipboard.writeText(command).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied';
    showToast('SSH command copied to clipboard', 'success');
    setTimeout(() => btn.innerHTML = original, 2000);
  }).catch(err => {
    showToast('Failed to copy SSH command', 'error');
  });
}

// Initialize both managers
const projectWizard = new ProjectWizard();
const deploymentHistory = new DeploymentHistory();

// Global functions to open modals (called from HTML)
function openProjectWizard() {
  projectWizard.openModal();
}

function openDeploymentHistory(projectId) {
  deploymentHistory.openModal(projectId);
}

// Export for use in other scripts if needed
if (typeof window !== 'undefined') {
  window.projectWizard = projectWizard;
  window.deploymentHistory = deploymentHistory;
  window.openProjectWizard = openProjectWizard;
  window.openDeploymentHistory = openDeploymentHistory;
  window.deleteProject = deleteProject;
  window.launchEnvironment = launchEnvironment;
  window.copyPassword = copyPassword;
  window.copySSH = copySSH;
}