class ProjectWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;

    this.projectData = {
      gitProvider: null,
      name: '',
      repositoryUrl: '',
      description: '',
      framework: 'nodejs',
      envVars: []
    };

    this.modal = null;
    this.stepSections = [];
    this.stepIndicators = [];

    this.validationRules = {
      1: () => this.validateStep1(),
      2: () => this.validateStep2(),
      3: () => true,
      4: () => true
    };

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
    this.modal = document.getElementById('wizardModal');
    this.stepSections = document.querySelectorAll('.step-section');
    this.stepIndicators = document.querySelectorAll('.wizard-step');

    document.getElementById('btnNext')?.addEventListener('click', () => this.nextStep());
    document.getElementById('btnBack')?.addEventListener('click', () => this.previousStep());
    document.getElementById('btnSubmit')?.addEventListener('click', () => this.submitProject());

    document.getElementById('closeWizard')?.addEventListener('click', () => this.closeModal());
    document.querySelector('.wizard-overlay')?.addEventListener('click', () => this.closeModal());

    this.stepIndicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        const targetStep = index + 1;
        if (targetStep < this.currentStep || this.canNavigateToStep(targetStep)) {
          this.goToStep(targetStep);
        }
      });
    });

    document.querySelectorAll('.git-provider-card').forEach(card => {
      card.addEventListener('click', (e) => this.selectGitProvider(e.currentTarget));
    });

    document.querySelectorAll('.framework-card').forEach(card => {
      card.addEventListener('click', (e) => this.selectFramework(e.currentTarget));
    });

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

    document.getElementById('btnAddEnv')?.addEventListener('click', () => this.addEnvVar());

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

    this.currentStep = 1;
    this.projectData = {
      gitProvider: null,
      name: '',
      repositoryUrl: '',
      description: '',
      framework: 'nodejs',
      envVars: []
    };

    document.getElementById('projectName').value = '';
    document.getElementById('repositoryUrl').value = '';
    document.getElementById('projectDescription').value = '';

    document.querySelectorAll('.git-provider-card').forEach(card =>
      card.classList.remove('selected')
    );
    document.querySelectorAll('.framework-card').forEach(card =>
      card.classList.remove('selected')
    );

    const defaultFramework = document.querySelector('[data-framework="nodejs"]');

    if (defaultFramework) {
      defaultFramework.classList.add('selected');
    }

    this.projectData.framework = 'nodejs';

    this.projectData.envVars = [];
    this.renderEnvVars();

    this.modal.style.display = 'flex';
    setTimeout(() => this.modal.classList.add('show'), 10);

    this.goToStep(1);

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
    if (targetStep <= this.currentStep) return true;

    for (let step = 1; step < targetStep; step++) {
      if (!this.validationRules[step]()) return false;
    }
    return true;
  }

  updateStepUI() {
    this.stepSections.forEach((section, index) => {
      if (index + 1 === this.currentStep) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    this.stepIndicators.forEach((indicator, index) => {
      const stepNum = index + 1;

      if (stepNum === this.currentStep) {
        indicator.classList.add('active');
        indicator.classList.remove('completed');
      } else if (stepNum < this.currentStep) {
        indicator.classList.add('completed');
        indicator.classList.remove('active');

        const stepIndicator = indicator.querySelector('.step-indicator');
        if (stepIndicator && !stepIndicator.querySelector('.fa-check')) {
          stepIndicator.innerHTML = '<i class="fas fa-check"></i>';
        }
      } else {
        indicator.classList.remove('active', 'completed');

        const stepIndicator = indicator.querySelector('.step-indicator');
        if (stepIndicator) {
          stepIndicator.textContent = stepNum;
        }
      }
    });

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

    if (this.currentStep === 1) {
      btnBack.style.display = 'none';
    } else {
      btnBack.style.display = 'inline-flex';
    }

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
    document.querySelectorAll('.git-provider-card').forEach(c =>
      c.classList.remove('selected')
    );

    card.classList.add('selected');
    this.projectData.gitProvider = card.dataset.provider;
  }

  selectFramework(card) {
    document.querySelectorAll('.framework-card').forEach(c => {
      c.classList.remove('selected');
    });

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

    container.innerHTML = '';

    if (this.projectData.envVars.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

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
    document.getElementById('reviewProjectName').textContent =
      this.projectData.name || 'Not specified';
    document.getElementById('reviewRepoUrl').textContent =
      this.projectData.repositoryUrl || 'Not specified';
    document.getElementById('reviewDescription').textContent =
      this.projectData.description || 'No description provided';

    const gitProviderName = this.projectData.gitProvider
      ? this.projectData.gitProvider.charAt(0).toUpperCase() + this.projectData.gitProvider.slice(1)
      : 'Not selected';
    document.getElementById('reviewGitProvider').textContent = gitProviderName;

    const frameworkCard = document.querySelector(`.framework-card[data-framework="${this.projectData.framework}"]`);
    const frameworkName = frameworkCard
      ? frameworkCard.querySelector('h4').textContent
      : 'Not selected';
    document.getElementById('reviewFramework').textContent = frameworkName;

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

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Project...';
    loadingOverlay.classList.add('active');

    try {
      const payload = {
        name: this.projectData.name,
        repository_url: this.projectData.repositoryUrl,
        description: this.projectData.description,
        tags: this.projectData.framework
      };

      if (this.projectData.envVars.length > 0) {
        const envVarsText = this.projectData.envVars
          .map(v => `${v.key}=${v.value}`)
          .join(', ');
        payload.description += `\n\nEnvironment Variables: ${envVarsText}`;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        showToast('Project created successfully! Redirecting...', 'success');

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

    document.getElementById('closeDeployment')?.addEventListener('click', () => this.closeModal());
    document.querySelector('.deployment-overlay')?.addEventListener('click', () => this.closeModal());

    document.getElementById('btnRedeploy')?.addEventListener('click', () => this.triggerRedeploy());

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

    this.modal.style.display = 'flex';
    setTimeout(() => this.modal.classList.add('show'), 10);

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
          <div class="timeline-version">${deployment.version || 'v-unknown'}</div>
          <span class="timeline-status ${statusClass}">${deployment.status}</span>
        </div>
        <div class="timeline-details">
          <div class="timeline-detail">
            <div class="timeline-detail-label">Commit</div>
            <div class="timeline-detail-value">${(deployment.commit_hash || 'N/A').substring(0, 8)}</div>
          </div>
          <div class="timeline-detail">
            <div class="timeline-detail-label">Environment</div>
            <div class="timeline-detail-value">${deployment.environment || 'production'}</div>
          </div>
          <div class="timeline-detail">
            <div class="timeline-detail-label">By</div>
            <div class="timeline-detail-value">${deployment.deployed_by || 'system'}</div>
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

    const originalText = btnRedeploy.innerHTML;
    btnRedeploy.disabled = true;
    btnRedeploy.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Building...';

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

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

        await this.loadDeployments();

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

function deleteProject(projectId, projectName) {
  showConfirm(
    "Delete Project",
    `Are you sure you want to delete "${projectName}"? This will permanently delete the project and all its deployments. This action cannot be undone.`,
    async () => {
      const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);

      if (projectCard) {
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
          showToast(`Project "${projectName}" deleted successfully`, 'success');

          if (projectCard) {
            projectCard.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            projectCard.style.transform = 'scale(0.9)';
            projectCard.style.opacity = '0';

            setTimeout(() => {
              projectCard.remove();

              const remainingCards = document.querySelectorAll('.project-card').length;
              if (remainingCards === 0) {
                window.location.reload();
              }
            }, 400);
          } else {
            setTimeout(() => window.location.reload(), 1000);
          }
        } else {
          throw new Error(data.error || 'Failed to delete project');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        showToast(`Failed to delete project: ${error.message}`, 'error');

        if (projectCard) {
          projectCard.style.opacity = '1';
          projectCard.style.pointerEvents = 'auto';
        }
      }
    }
  );
}

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

const projectWizard = new ProjectWizard();
const deploymentHistory = new DeploymentHistory();

function openProjectWizard() {
  projectWizard.openModal();
}

function openDeploymentHistory(projectId) {
  deploymentHistory.openModal(projectId);
}

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