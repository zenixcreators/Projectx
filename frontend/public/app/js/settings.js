/**
 * Aurora — Settings Page Controller
 * Single Page Application logic in vanilla JS
 */

async function loadSettingsData() {
  const setFirstName = document.getElementById('setFirstName');
  const setLastName = document.getElementById('setLastName');
  const toggleEmailAlerts = document.getElementById('toggleEmailAlerts');
  const toggleWeeklyDigest = document.getElementById('toggleWeeklyDigest');

  try {
    const res = await fetch('/auth/me');
    if (!res.ok) {
      if (res.status === 401 && window.Auth?.logout) return window.Auth.logout();
      throw new Error('Failed to load settings details.');
    }
    const data = await res.json();
    const user = data.user;
    if (!user) return;

    if (setFirstName) setFirstName.value = user.firstName || '';
    if (setLastName) setLastName.value = user.lastName || '';
    
    if (user.notifications) {
      if (toggleEmailAlerts) {
        toggleEmailAlerts.checked = user.notifications.emailAlerts !== false;
      }
      if (toggleWeeklyDigest) {
        toggleWeeklyDigest.checked = user.notifications.weeklyDigest === true;
      }
    }
  } catch (err) {
    console.error('Settings loading error:', err);
  }
}

async function saveProfileSettings(e) {
  if (e) e.preventDefault();

  const firstName = document.getElementById('setFirstName')?.value.trim();
  const lastName = document.getElementById('setLastName')?.value.trim();
  const emailAlerts = document.getElementById('toggleEmailAlerts')?.checked;
  const weeklyDigest = document.getElementById('toggleWeeklyDigest')?.checked;
  
  const msgEl = document.getElementById('profileSettingsMsg');
  const btn = document.getElementById('btnSaveProfile');

  if (!firstName) return;

  if (btn) btn.disabled = true;
  if (msgEl) {
    msgEl.textContent = 'Saving...';
    msgEl.style.color = 'var(--text-sec)';
  }

  try {
    const res = await fetch('/api/user/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, emailAlerts, weeklyDigest })
    });

    if (!res.ok) {
      if (res.status === 401 && window.Auth?.logout) return window.Auth.logout();
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save settings.');
    }

    const data = await res.json();
    if (data.success) {
      if (msgEl) {
        msgEl.textContent = 'Saved successfully!';
        msgEl.style.color = 'var(--green)';
        setTimeout(() => msgEl.textContent = '', 3000);
      }
      
      // Update global UI state & header name
      if (typeof window.loadCurrentUser === 'function') {
        window.loadCurrentUser();
      }
    }
  } catch (err) {
    console.error(err);
    if (msgEl) {
      msgEl.textContent = window.getFriendlyErrorMessage(err.message || 'Error saving settings.');
      msgEl.style.color = 'var(--red)';
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function updateNotificationToggles() {
  const firstName = document.getElementById('setFirstName')?.value.trim();
  const lastName = document.getElementById('setLastName')?.value.trim();
  const emailAlerts = document.getElementById('toggleEmailAlerts')?.checked;
  const weeklyDigest = document.getElementById('toggleWeeklyDigest')?.checked;
  const msgEl = document.getElementById('notificationSettingsMsg');

  if (!firstName) return; // Prevent saving if name fields not populated yet

  if (msgEl) {
    msgEl.textContent = 'Updating preferences...';
    msgEl.style.color = 'var(--text-sec)';
  }

  try {
    const res = await fetch('/api/user/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, emailAlerts, weeklyDigest })
    });

    if (res.ok) {
      if (msgEl) {
        msgEl.textContent = 'Notification preferences updated!';
        msgEl.style.color = 'var(--green)';
        setTimeout(() => msgEl.textContent = '', 2500);
      }
    }
  } catch (err) {
    console.error(err);
    if (msgEl) {
      msgEl.textContent = 'Failed to update preferences.';
      msgEl.style.color = 'var(--red)';
    }
  }
}

async function savePasswordSettings(e) {
  if (e) e.preventDefault();

  const currentPassword = document.getElementById('setOldPassword')?.value;
  const newPassword = document.getElementById('setNewPassword')?.value;
  const msgEl = document.getElementById('passwordSettingsMsg');
  const btn = document.getElementById('btnSavePassword');

  if (!currentPassword || !newPassword) return;

  if (btn) btn.disabled = true;
  if (msgEl) {
    msgEl.textContent = 'Updating password...';
    msgEl.style.color = 'var(--text-sec)';
  }

  try {
    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (!res.ok) {
      if (res.status === 401 && window.Auth?.logout) return window.Auth.logout();
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update password.');
    }

    const data = await res.json();
    if (data.success) {
      if (msgEl) {
        msgEl.textContent = 'Password updated successfully!';
        msgEl.style.color = 'var(--green)';
        setTimeout(() => msgEl.textContent = '', 4000);
      }
      
      // Reset inputs
      const oldPassEl = document.getElementById('setOldPassword');
      const newPassEl = document.getElementById('setNewPassword');
      if (oldPassEl) oldPassEl.value = '';
      if (newPassEl) newPassEl.value = '';
    }
  } catch (err) {
    console.error(err);
    if (msgEl) {
      msgEl.textContent = window.getFriendlyErrorMessage(err.message || 'Error updating password.');
      msgEl.style.color = 'var(--red)';
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function triggerLogoutAllDevices() {
  const btn = document.getElementById('btnLogoutAll');
  const msgEl = document.getElementById('logoutAllMsg');

  if (!confirm('Are you sure you want to log out from all other devices? This will invalidate all other active sessions.')) {
    return;
  }

  if (btn) btn.disabled = true;
  if (msgEl) {
    msgEl.textContent = 'Revoking security tokens...';
    msgEl.style.color = 'var(--text-sec)';
  }

  try {
    const res = await fetch('/api/user/logout-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      if (msgEl) {
        msgEl.textContent = 'Logged out from all other devices successfully!';
        msgEl.style.color = 'var(--green)';
        setTimeout(() => msgEl.textContent = '', 4000);
      }
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to log out other devices.');
    }
  } catch (err) {
    console.error(err);
    if (msgEl) {
      msgEl.textContent = window.getFriendlyErrorMessage(err.message || 'Error during token revocation.');
      msgEl.style.color = 'var(--red)';
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

function initSettings() {
  loadSettingsData();
}

if (document.getElementById('settings-view')) {
  initSettings();
} else {
  document.addEventListener('aurora:partials-loaded', initSettings, { once: true });
}

// Expose handlers globally
window.saveProfileSettings = saveProfileSettings;
window.updateNotificationToggles = updateNotificationToggles;
window.savePasswordSettings = savePasswordSettings;
window.triggerLogoutAllDevices = triggerLogoutAllDevices;
window.loadSettingsData = loadSettingsData;
