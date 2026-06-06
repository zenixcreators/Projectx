/**
 * Aurora — Profile Page Controller
 * Single Page Application logic in vanilla JS
 */

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

async function loadProfileData() {
  const profileNameHeader = document.getElementById('profileNameHeader');
  const profilePlanBadge = document.getElementById('profilePlanBadge');
  const profileEmailVal = document.getElementById('profileEmailVal');
  const profileTierVal = document.getElementById('profileTierVal');
  const profileUsageVal = document.getElementById('profileUsageVal');
  const profileJoinedVal = document.getElementById('profileJoinedVal');
  const profileAvatarDisplay = document.getElementById('profileAvatarDisplay');

  try {
    const res = await fetch('/auth/me');
    if (!res.ok) {
      if (res.status === 401 && window.Auth?.logout) return window.Auth.logout();
      throw new Error('Failed to load profile details.');
    }
    const data = await res.json();
    const user = data.user;
    if (!user) return;

    // Populate header name
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || user.email;
    if (profileNameHeader) {
      profileNameHeader.textContent = fullName;
    }

    // Populate plan badges & table rows
    const planName = String(user.plan || 'trial').toLowerCase();
    const prettyPlanName = planName.charAt(0).toUpperCase() + planName.slice(1);
    
    if (profilePlanBadge) {
      profilePlanBadge.textContent = prettyPlanName;
      // Change color based on plan if desired
      if (planName === 'pro') {
        profilePlanBadge.className = 'plan-badge';
      } else if (planName === 'creator') {
        profilePlanBadge.className = 'plan-badge plan-badge-popular';
      } else {
        profilePlanBadge.className = 'plan-badge';
        profilePlanBadge.style.background = 'var(--surface2)';
        profilePlanBadge.style.color = 'var(--text-sec)';
      }
    }

    if (profileEmailVal) profileEmailVal.textContent = user.email;
    if (profileTierVal) profileTierVal.textContent = prettyPlanName;
    if (profileUsageVal) {
      const isCreator = String(user.plan || '').toLowerCase() === 'creator';
      profileUsageVal.textContent = isCreator
        ? `${user.generationsUsed || 0} / Unlimited generations`
        : `${user.generationsUsed || 0} / ${user.generationLimit || 20} generations`;
    }
    if (profileJoinedVal) {
      profileJoinedVal.textContent = formatDate(user.createdAt);
    }

    // Populate Avatar
    if (profileAvatarDisplay) {
      if (user.avatar) {
        profileAvatarDisplay.innerHTML = `<img class="profile-avatar-img" src="${user.avatar}" alt="${fullName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        const initials = (user.firstName || user.name || 'U').charAt(0).toUpperCase();
        profileAvatarDisplay.innerHTML = `<span class="profile-avatar-img" style="font-size:36px;display:flex;align-items:center;justify-content:center;background:var(--surface2);border-radius:50%;height:100%;color:var(--text-sec);">${initials}</span>`;
      }
    }

  } catch (err) {
    console.error('Profile loading error:', err);
  }
}

// Avatar upload handlers
function triggerAvatarUploadSelect() {
  const fileInput = document.getElementById('avatarFileInput');
  if (fileInput) fileInput.click();
}

async function handleAvatarFileSelect(input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar', file);

  const profileAvatarDisplay = document.getElementById('profileAvatarDisplay');
  const oldHtml = profileAvatarDisplay.innerHTML;
  
  // Show spinner
  profileAvatarDisplay.innerHTML = `
    <span class="profile-avatar-img" style="font-size:36px;display:flex;align-items:center;justify-content:center;background:var(--surface2);border-radius:50%;height:100%;color:var(--text-sec);">
      <i class="fa-solid fa-spinner animate-spin"></i>
    </span>
  `;

  try {
    const res = await fetch('/api/user/upload-avatar', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      if (res.status === 401 && window.Auth?.logout) return window.Auth.logout();
      throw new Error('Avatar upload failed');
    }

    const data = await res.json();
    if (data.success && data.avatarUrl) {
      await loadProfileData();
      if (typeof window.loadCurrentUser === 'function') {
        window.loadCurrentUser();
      }
    }
  } catch (err) {
    console.error('Avatar upload failure:', err);
    window.showToast("Upload Failed", "Failed to upload image. Please ensure it is an image file and under 5MB.", "error");
    profileAvatarDisplay.innerHTML = oldHtml;
  }
}

// Delete Account Modal handlers
function triggerDeleteAccount() {
  const modal = document.getElementById('deleteAccountModal');
  if (modal) {
    modal.classList.add('open');
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteAccountModal');
  const input = document.getElementById('deleteAccountConfirmInput');
  const btn = document.getElementById('deleteConfirmBtn');

  if (modal) modal.classList.remove('open');
  if (input) input.value = '';
  if (btn) btn.disabled = true;
}

async function submitDeleteAccount() {
  const input = document.getElementById('deleteAccountConfirmInput');
  if (!input || input.value !== 'DELETE') return;

  try {
    const res = await fetch('/api/user/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      window.location.href = '/';
    } else {
      const data = await res.json().catch(() => ({}));
      window.showToast("Delete Account Failed", data.error || 'Failed to delete account. Please try again.', "error");
    }
  } catch (err) {
    console.error('Account deletion error:', err);
    window.showToast("Connection Failure", "Could not delete account due to a network connection failure.", "error");
  }
}

function initProfile() {
  loadProfileData();

  // Watch deletion confirmation input
  const input = document.getElementById('deleteAccountConfirmInput');
  const btn = document.getElementById('deleteConfirmBtn');
  if (input && btn) {
    input.addEventListener('input', () => {
      btn.disabled = input.value !== 'DELETE';
    });
  }
}

if (document.getElementById('profile-view')) {
  initProfile();
} else {
  document.addEventListener('aurora:partials-loaded', initProfile, { once: true });
}

// Expose handlers globally
window.triggerAvatarUploadSelect = triggerAvatarUploadSelect;
window.handleAvatarFileSelect = handleAvatarFileSelect;
window.triggerDeleteAccount = triggerDeleteAccount;
window.closeDeleteModal = closeDeleteModal;
window.submitDeleteAccount = submitDeleteAccount;
window.loadProfileData = loadProfileData;
