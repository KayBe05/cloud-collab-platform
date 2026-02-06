// ==================== Settings Page JavaScript ====================

// Configuration
const SETTINGS_CONFIG = {
  STORAGE_KEYS: {
    THEME: 'cloudx_theme_preference',
    SIDEBAR_POSITION: 'cloudx_sidebar_position',
    DENSITY: 'cloudx_interface_density',
    NOTIFICATIONS: 'cloudx_notifications'
  },
  API_KEY: null,
  MASKED_API_KEY: 'Not Configured'
};

// ==================== Theme Management ====================

class ThemeManager {
  constructor() {
    this.currentTheme = this.loadTheme();
    this.applyTheme(this.currentTheme);
    this.initThemeSelector();
  }

  loadTheme() {
    const savedTheme = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEYS.THEME);
    return savedTheme || 'system';
  }

  applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'system') {
      // Remove manual override, let CSS @media handle it
      html.removeAttribute('data-theme');
    } else {
      // Set explicit theme
      html.setAttribute('data-theme', theme);
    }

    localStorage.setItem(SETTINGS_CONFIG.STORAGE_KEYS.THEME, theme);
    this.updateThemeUI(theme);
  }

  updateThemeUI(theme) {
    // Update active state on theme options
    document.querySelectorAll('.theme-option').forEach(option => {
      const optionTheme = option.getAttribute('data-theme');
      if (optionTheme === theme) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }

  initThemeSelector() {
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.getAttribute('data-theme');
        this.applyTheme(theme);
        showToast(`Theme changed to ${theme}`, 'success');
      });
    });
  }
}

// ==================== Form Management ====================

class FormManager {
  constructor() {
    this.initProfileForm();
    this.initPasswordForm();
    this.initAvatarUpload();
  }

  initProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        username: document.getElementById('username').value,
        bio: document.getElementById('bio').value,
        location: document.getElementById('location').value
      };

      // Simulate API call
      setTimeout(() => {
        showToast('Profile updated successfully!', 'success');
        console.log('Profile data:', formData);
      }, 500);
    });
  }

  initPasswordForm() {
    const form = document.getElementById('passwordForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill in all password fields', 'error');
        return;
      }

      if (newPassword.length < 8) {
        showToast('New password must be at least 8 characters', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
      }

      // Simulate API call
      setTimeout(() => {
        showToast('Password updated successfully!', 'success');
        form.reset();
      }, 500);
    });
  }

  initAvatarUpload() {
    const input = document.getElementById('avatarUpload');
    const preview = document.getElementById('avatarImage');

    if (!input || !preview) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
      }

      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size must be less than 2MB', 'error');
        return;
      }

      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        showToast('Avatar updated! Click "Save Changes" to confirm', 'success');
      };
      reader.readAsDataURL(file);
    });
  }
}

// ==================== API Key Management ====================

function copyApiKey() {
  const apiKey = SETTINGS_CONFIG.API_KEY;

  navigator.clipboard.writeText(apiKey).then(() => {
    showToast('API key copied to clipboard', 'success');
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = apiKey;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('API key copied to clipboard', 'success');
  });
}

function regenerateApiKey() {
  if (!confirm('Are you sure you want to regenerate your API key? This will invalidate your current key and cannot be undone.')) {
    return;
  }

  // Simulate API key regeneration
  const newKey = generateRandomApiKey();
  SETTINGS_CONFIG.API_KEY = newKey;

  const keyElement = document.getElementById('apiKeyValue');
  if (keyElement) {
    keyElement.textContent = maskApiKey(newKey);
  }

  showToast('New API key generated successfully!', 'success');
}

function generateRandomApiKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_live_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function maskApiKey(key) {
  if (!key || key.length < 12) return key;
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  return `${prefix}${'•'.repeat(24)}${suffix}`;
}

// ==================== Utility Functions ====================

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const button = input.nextElementSibling.querySelector('.input-icon-btn');
  const icon = button.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

function resetProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  if (confirm('Are you sure you want to reset all changes?')) {
    form.reset();
    showToast('Form reset successfully', 'info');
  }
}

function removeAvatar() {
  if (!confirm('Are you sure you want to remove your profile picture?')) {
    return;
  }

  const preview = document.getElementById('avatarImage');
  if (preview) {
    preview.src = 'https://ui-avatars.com/api/?name=User&background=0EA5E9&color=fff&size=200';
    showToast('Avatar removed. Click "Save Changes" to confirm', 'success');
  }
}

// ==================== Notification Management ====================

class NotificationManager {
  constructor() {
    this.initToggleSwitches();
    this.initPushNotifications();
  }

  initToggleSwitches() {
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const notificationItem = e.target.closest('.notification-item');
        const notificationName = notificationItem?.querySelector('h4')?.textContent || 'Notification';
        const isEnabled = e.target.checked;

        showToast(
          `${notificationName} ${isEnabled ? 'enabled' : 'disabled'}`,
          'success'
        );

        this.saveNotificationPreference(notificationName, isEnabled);
      });
    });
  }

  initPushNotifications() {
    const pushToggle = document.getElementById('pushNotifications');
    if (!pushToggle) return;

    pushToggle.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await this.requestPushPermission();
      } else {
        showToast('Push notifications disabled', 'info');
      }
    });
  }

  async requestPushPermission() {
    if (!('Notification' in window)) {
      showToast('Push notifications are not supported in your browser', 'error');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      showToast('Push notifications enabled!', 'success');
      new Notification('CloudX Platform', {
        body: 'You will now receive push notifications',
        icon: '/static/favicon.ico'
      });
    } else {
      showToast('Push notification permission denied', 'error');
      document.getElementById('pushNotifications').checked = false;
    }
  }

  saveNotificationPreference(name, enabled) {
    const preferences = this.loadNotificationPreferences();
    preferences[name] = enabled;
    localStorage.setItem(
      SETTINGS_CONFIG.STORAGE_KEYS.NOTIFICATIONS,
      JSON.stringify(preferences)
    );
  }

  loadNotificationPreferences() {
    const saved = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : {};
  }
}

// ==================== Preferences Management ====================

class PreferencesManager {
  constructor() {
    this.initPreferences();
  }

  initPreferences() {
    // Sidebar Position
    const sidebarSelect = document.getElementById('sidebarPosition');
    if (sidebarSelect) {
      sidebarSelect.addEventListener('change', (e) => {
        this.savePref(SETTINGS_CONFIG.STORAGE_KEYS.SIDEBAR_POSITION, e.target.value);
        showToast(`Sidebar position set to ${e.target.value}`, 'success');
      });
    }

    // Interface Density
    const densitySelect = document.getElementById('density');
    if (densitySelect) {
      densitySelect.addEventListener('change', (e) => {
        this.savePref(SETTINGS_CONFIG.STORAGE_KEYS.DENSITY, e.target.value);
        showToast(`Interface density set to ${e.target.value}`, 'success');
      });
    }

    // Load saved preferences
    this.loadPreferences();
  }

  savePref(key, value) {
    localStorage.setItem(key, value);
  }

  loadPreferences() {
    const sidebarPos = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEYS.SIDEBAR_POSITION);
    const density = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEYS.DENSITY);

    if (sidebarPos) {
      const select = document.getElementById('sidebarPosition');
      if (select) select.value = sidebarPos;
    }

    if (density) {
      const select = document.getElementById('density');
      if (select) select.value = density;
    }
  }
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all managers
  const themeManager = new ThemeManager();
  const formManager = new FormManager();
  const notificationManager = new NotificationManager();
  const preferencesManager = new PreferencesManager();

  // Add animation class to sections on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '0';
        entry.target.style.transform = 'translateY(20px)';

        requestAnimationFrame(() => {
          entry.target.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        });
      }
    });
  }, observerOptions);

  document.querySelectorAll('.settings-section').forEach(section => {
    observer.observe(section);
  });

  console.log('Settings page initialized successfully');
});

// ==================== Additional CSS for Dark Mode Support ====================

// Inject additional CSS for theme support
const themeStyles = document.createElement('style');
themeStyles.textContent = `
  /* Light theme (default) */
  html[data-theme="light"] {
    --bg-primary: #FFFFFF;
    --bg-secondary: #F8FAFC;
    --bg-tertiary: #F1F5F9;
    --bg-card: #FFFFFF;
    --bg-hover: #F8FAFC;
    --text-primary: #0F172A;
    --text-secondary: #475569;
    --text-tertiary: #94A3B8;
    --border-color: #E2E8F0;
    --border-light: #F1F5F9;
  }

  /* Dark theme */
  html[data-theme="dark"] {
    --bg-primary: #0F172A;
    --bg-secondary: #1E293B;
    --bg-tertiary: #334155;
    --bg-card: #1E293B;
    --bg-hover: #334155;
    --text-primary: #F1F5F9;
    --text-secondary: #CBD5E1;
    --text-tertiary: #94A3B8;
    --border-color: #334155;
    --border-light: #475569;
    --bg-sidebar: #0F172A;
    --bg-sidebar-hover: #1E293B;
  }
`;
document.head.appendChild(themeStyles);