const sidebar = document.getElementById('sidebar');
const sidebarLogoImg = document.getElementById('sidebarLogoImg');

function spinLogo() {
  if (!sidebarLogoImg) return;
  sidebarLogoImg.classList.remove('spinning');
  // Force reflow so re-adding the class restarts the animation
  void sidebarLogoImg.offsetWidth;
  sidebarLogoImg.classList.add('spinning');
  sidebarLogoImg.addEventListener('animationend', () => {
    sidebarLogoImg.classList.remove('spinning');
  }, { once: true });
}

if (sidebar) {
  document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    spinLogo();
  });

  // Spin logo on nav scroll
  const sidebarNav = sidebar.querySelector('.sidebar-nav');
  let scrollSpinTimer;
  sidebarNav?.addEventListener('scroll', () => {
    clearTimeout(scrollSpinTimer);
    scrollSpinTimer = setTimeout(spinLogo, 120);
  }, { passive: true });
}

function switchView(btn) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');

  const targetId = btn.getAttribute('data-target');
  if (!targetId) return;

  document.getElementById('current-view-title').innerText = btn.getAttribute('data-title') || '';
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  const target = document.getElementById(targetId);
  if (target) {
    target.classList.add('active');
    
    // Smoothly scroll the content viewport to the top for a premium, seamless transition!
    const scrollContainer = target.querySelector('.analysis-layout') || target.querySelector('[style*="overflow"]') || target;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  const newHeight = Math.min(el.scrollHeight, 200);
  el.style.height = newHeight + 'px';
  el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
}

// ─── GLOBAL PLAN UPGRADE MODAL HANDLERS ───
let selectedModalPlan = null;

window.showUpgradeModal = function () {
  const modal = document.getElementById('upgradeModal');
  if (modal) {
    modal.classList.add('open');
  }
};

window.hideUpgradeModal = function () {
  const modal = document.getElementById('upgradeModal');
  const cardPro = document.getElementById('modalPlanPro');
  const cardCreator = document.getElementById('modalPlanCreator');
  const btn = document.getElementById('modalUpgradeConfirmBtn');

  if (modal) modal.classList.remove('open');
  if (cardPro) cardPro.classList.remove('active');
  if (cardCreator) cardCreator.classList.remove('active');
  if (btn) btn.disabled = true;
  selectedModalPlan = null;
};

window.selectModalPlan = function (plan) {
  selectedModalPlan = plan;
  const cardPro = document.getElementById('modalPlanPro');
  const cardCreator = document.getElementById('modalPlanCreator');
  const btn = document.getElementById('modalUpgradeConfirmBtn');

  if (cardPro) cardPro.classList.remove('active');
  if (cardCreator) cardCreator.classList.remove('active');

  if (plan === 'pro' && cardPro) cardPro.classList.add('active');
  if (plan === 'creator' && cardCreator) cardCreator.classList.add('active');

  if (btn) btn.disabled = false;
};

window.submitModalPlanUpgrade = async function () {
  if (!selectedModalPlan) return;
  const btn = document.getElementById('modalUpgradeConfirmBtn');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/user/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedModalPlan })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Upgrade failed.');
    }

    const data = await res.json();
    if (data.success) {
      window.showToast("Upgrade Successful", `Successfully upgraded to the ${selectedModalPlan.toUpperCase()} Plan!`, "success");
      window.hideUpgradeModal();

      // Refresh data across the SPA
      if (typeof window.loadBillingData === 'function') {
        window.loadBillingData();
      }
      if (typeof window.loadDashboardData === 'function') {
        window.loadDashboardData();
      }
      if (typeof window.loadCurrentUser === 'function') {
        window.loadCurrentUser();
      }
    }
  } catch (err) {
    console.error(err);
    window.showToast("Upgrade Failed", err.message || 'Error subscribing to plan. Please try again.', "error");
  } finally {
    if (btn) btn.disabled = false;
  }
};

// ─── GLOBAL FETCH RESPONSE INTERCEPTOR ───
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  
  if (response.status === 403) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data.code === 'LIMIT_REACHED') {
        window.showUpgradeModal();
      }
    } catch (e) {
      // Ignored: Response is not JSON or does not have limit check code
    }
  } else if (response.status === 429) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      window.showToast("Take a Breather", data.error || "You've sent too many requests. Please take a short break.", "warning");
    } catch (e) {
      window.showToast("Take a Breather", "You've sent too many requests. Please take a short break.", "warning");
    }
  }
  
  return response;
};

/* ─────────────────────────────────────────
   TOAST NOTIFICATION ENGINE
───────────────────────────────────────── */
window.getFriendlyErrorMessage = function (message) {
  if (!message || typeof message !== 'string') return 'Something went wrong. Please try again.';
  
  const msg = message.toLowerCase().trim();
  
  // Rate limits
  if (msg.includes('too many script') || msg.includes('too many analyses')) {
    return "Slow down! You've generated several scripts recently. Let's take a 15-minute breather before creating the next one.";
  }
  if (msg.includes('too many captions')) {
    return "Hold on! We're localizing a lot of captions for you. Let's pause for 15 minutes before submitting new audio.";
  }
  if (msg.includes('too many competitor') || msg.includes('too many channel scans') || msg.includes('too many requests')) {
    return "Scanning engine is warm! You've audited multiple channels recently. Please wait 15 minutes before scanning more.";
  }
  if (msg.includes('too many authentication') || msg.includes('too many sign-in') || msg.includes('rate limit')) {
    return "Too many sign-in attempts. For security, please wait 15 minutes before trying again.";
  }
  
  // Database / Connection
  if (msg.includes('database is currently unavailable') || msg.includes('mongodb') || msg.includes('readystate') || msg.includes('buffering timed out')) {
    return "We're having trouble saving your work to the database right now. We've saved a copy locally, so don't close your browser.";
  }
  if (msg.includes('failed to load saved scripts')) {
    return "We couldn't retrieve your script library right now. Please refresh the page to reload.";
  }
  if (msg.includes('connection error') || msg.includes('failed to fetch') || msg.includes('network')) {
    return "Could not connect to the network. Please check your internet connection and try again.";
  }
  
  // Script / Hook Generator Input Validation
  if (msg.includes('missing or invalid \'input\'') || msg.includes('topic is required') || msg.includes('missing or invalid \'topic\'')) {
    return "What topic would you like to write about? Please type a topic or script description in the input box first.";
  }
  if (msg.includes('required fields missing') || msg.includes('fields missing')) {
    return "Please fill out all the fields in the form before submitting.";
  }
  if (msg.includes('first name is required')) {
    return "We'd love to know your name! Please fill in your first name to continue.";
  }
  if (msg.includes('groq api key is missing') || msg.includes('server configuration error')) {
    return "It looks like the AI server connection isn't configured yet. Please check your setup or contact the administrator.";
  }
  if (msg.includes('script generation failed') || msg.includes('failed to generate script')) {
    return "Our storytelling engine ran into a bump. Please check your prompt and try again in a few moments.";
  }
  
  // Auth Errors
  if (msg.includes('use a trusted google') || msg.includes('trusted email')) {
    return "Please sign up using a Google, Outlook, or Proton email account to keep your space secure.";
  }
  if (msg.includes('password must be at least 10 characters') || msg.includes('strong password')) {
    return "To keep your account secure, choose a password with at least 10 characters, including an uppercase letter, lowercase letter, a number, and a symbol.";
  }
  if (msg.includes('user already exists') || msg.includes('already registered')) {
    return "It looks like you already have an account! Please log in directly.";
  }
  if (msg.includes('verification code expired') || msg.includes('otp expired')) {
    return "Your verification code has expired. Don't worry, click 'Resend' to get a fresh code.";
  }
  if (msg.includes('too many wrong codes') || msg.includes('too many incorrect attempts')) {
    return "Too many incorrect attempts. Please request a new verification code to try again.";
  }
  if (msg.includes('incorrect verification code') || msg.includes('incorrect reset code') || msg.includes('verification failed')) {
    return "That verification code didn't match. Please check the code in your email and try again.";
  }
  if (msg.includes('invalid credentials') || msg.includes('incorrect current password')) {
    return "The email or password didn't match. Please check your credentials and try again.";
  }
  if (msg.includes('verify your email before logging in')) {
    return "Almost there! Please verify your email using the verification code sent to your inbox before logging in.";
  }
  if (msg.includes('not an administrator') || msg.includes('access denied')) {
    return "Administrator access is required to view this portal. Please check your login details.";
  }
  if (msg.includes('google sign-in requires')) {
    return "Google sign-in requires a verified Gmail or Googlemail address to synchronize correctly.";
  }
  
  // Default fallback
  return message;
};

window.showToast = function (title, message, type = 'error') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconClass = type === 'success' ? 'fa-solid fa-circle-check' :
                    type === 'warning' ? 'fa-solid fa-circle-exclamation' :
                    'fa-solid fa-triangle-exclamation';

  const friendlyMessage = window.getFriendlyErrorMessage(message);

  toast.innerHTML = `
    <div class="toast-icon"><i class="${iconClass}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${friendlyMessage}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 220);
    }
  }, 5000);
};
