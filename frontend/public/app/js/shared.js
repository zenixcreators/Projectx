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
        // Re-align pill after sidebar width transition settles
        setTimeout(updateNavIndicator, 280);
    });

    // Spin logo on nav scroll
    const sidebarNav = sidebar.querySelector('.sidebar-nav');
    let scrollSpinTimer;
    sidebarNav?.addEventListener('scroll', () => {
        clearTimeout(scrollSpinTimer);
        scrollSpinTimer = setTimeout(spinLogo, 120);
    }, { passive: true });
}

/* ─────────────────────────────────────────
   NAV INDICATOR PILL — liquid glass slider
   Positions the pill behind the active tab
───────────────────────────────────────── */
function updateNavIndicator() {
    const activeItem = document.querySelector('.nav-item.active');
    const pill = document.getElementById('navIndicatorPill');
    if (!activeItem || !pill) return;

    pill.style.top    = `${activeItem.offsetTop}px`;
    pill.style.height = `${activeItem.offsetHeight}px`;
}

/* Triggers the bubbly liquid-morph animation and repositions pill */
let _pillMorphTimer = null;
function triggerLiquidPill() {
    const pill = document.getElementById('navIndicatorPill');
    if (!pill) return;

    // Remove then re-add .moving to restart animation even on rapid clicks
    pill.classList.remove('moving');
    void pill.offsetWidth; // force reflow
    pill.classList.add('moving');

    clearTimeout(_pillMorphTimer);
    _pillMorphTimer = setTimeout(() => {
        pill.classList.remove('moving');
    }, 490);
}

function switchView(btn) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');

    // Update indicator position first, then trigger bubbly morph
    updateNavIndicator();
    triggerLiquidPill();

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

        // Evaluate canvas empty states when switching views
        if (targetId === 'hook-view') {
            window.hookEmptyStateManager?.evaluateState();
        } else if (targetId === 'script-view') {
            window.scriptEmptyStateManager?.evaluateState();
        }
    }
}

// Position pill on initial load (after DOM + fonts render)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateNavIndicator, 120);
});

// Re-align on window resize
window.addEventListener('resize', updateNavIndicator, { passive: true });

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

window.setLiveBadgeLoading = function (isLoading) {
    const dot = document.querySelector('.status-dot-live');
    if (!dot) return;
    if (isLoading) {
        dot.classList.add('animate-pulse');
        dot.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
    } else {
        dot.classList.remove('animate-pulse');
        dot.style.animation = '';
    }
};

/* ── Creative Onboarding Empty State Manager ── */

class CanvasEmptyStateManager {
  constructor(canvasContainer, emptyStateEl, inputEl, lines, name) {
    this.canvasContainer = canvasContainer;
    this.emptyStateEl = emptyStateEl;
    this.inputEl = inputEl;
    this.lines = lines;
    this.name = name;

    this.onboardingContainer = null;
    this.timers = [];
    this.isActive = false;
    this.stepIndex = 1;
    this.isInputFocused = false;
    this.isGenerating = false;

    this.init();
  }

  init() {
    if (!this.canvasContainer) return;

    // Create and inject Onboarding container
    this.onboardingContainer = document.createElement('div');
    this.onboardingContainer.className = 'onboarding-container';
    
    if (this.name === 'hook') {
      this.onboardingContainer.innerHTML = `
        <div class="onboarding-header">
          <h1 class="onboarding-title">Hook Studio</h1>
          <p class="onboarding-subtitle">Write, test, and optimize high-retention video hooks.</p>
        </div>
        <div class="onboarding-steps">
          <div class="onboarding-step" id="hook-step-1">
            <div class="onboarding-step-meta">
              <span class="onboarding-step-num">01</span>
              <div class="onboarding-step-info">
                <h3 class="onboarding-step-title">Select Tone</h3>
                <p class="onboarding-step-desc">Match your content's emotional style.</p>
              </div>
            </div>
            <div class="onboarding-step-preview">
              <div class="tone-strip" style="gap: 8px; margin: 0; border: none; padding: 0; background: transparent;">
                <button class="tone-chip" id="hook-preview-tone-1" style="pointer-events: none;">⚡ Energetic</button>
                <button class="tone-chip" id="hook-preview-tone-2" style="pointer-events: none;">🔥 Controversial</button>
                <button class="tone-chip" id="hook-preview-tone-3" style="pointer-events: none;">💡 Authority</button>
              </div>
            </div>
          </div>
          <div class="onboarding-step" id="hook-step-2">
            <div class="onboarding-step-meta">
              <span class="onboarding-step-num">02</span>
              <div class="onboarding-step-info">
                <h3 class="onboarding-step-title">Write Prompt</h3>
                <p class="onboarding-step-desc">Describe your topic, hook, or niche.</p>
              </div>
            </div>
            <div class="onboarding-step-preview">
              <div class="input-shell" style="padding: 12px 16px; margin: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.04); background: #fff; width: 100%;">
                <div style="font-size: 13.5px; color: var(--text); min-height: 24px; text-align: left; font-family: var(--font);">
                  <span id="hook-preview-prompt-text"></span><span class="onboarding-cursor">|</span>
                </div>
              </div>
            </div>
          </div>
          <div class="onboarding-step" id="hook-step-3">
            <div class="onboarding-step-meta">
              <span class="onboarding-step-num">03</span>
              <div class="onboarding-step-info">
                <h3 class="onboarding-step-title">Analyze Hook</h3>
                <p class="onboarding-step-desc">Review your metrics scorecard.</p>
              </div>
            </div>
            <div class="onboarding-step-preview" style="background: transparent; border: none; box-shadow: none; padding: 0; min-height: auto;">
              <div class="hook-item best" id="hook-preview-card" style="margin: 0; pointer-events: none; width: 100%; transition: opacity 0.5s ease, transform 0.5s ease; opacity: 0; transform: translateY(4px); box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="flex:1;min-width:0;">
                  <div class="hook-best-label" style="font-family: var(--mono); text-transform: uppercase;">Controversial</div>
                  <div class="hook-text" style="font-size: 13.5px;">"I lost $40,000 following productivity advice. Here's what works."</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      this.onboardingContainer.innerHTML = `
        <div class="onboarding-header">
          <h1 class="onboarding-title">Script Studio</h1>
          <p class="onboarding-subtitle">Draft, structure, and optimize short-form video scripts.</p>
        </div>
        <div class="onboarding-steps">
          <div class="onboarding-step" id="script-step-1">
            <div class="onboarding-step-meta">
              <span class="onboarding-step-num">01</span>
              <div class="onboarding-step-info">
                <h3 class="onboarding-step-title">Select Format</h3>
                <p class="onboarding-step-desc">Toggle layout mode to fit your platform.</p>
              </div>
            </div>
            <div class="onboarding-step-preview">
              <div class="mode-selector-pill" style="position: static; transform: none; display: flex; width: auto; pointer-events: none; margin: 0; border: 1px solid var(--border);">
                <button class="mode-btn" id="script-preview-mode-1">Long Form</button>
                <button class="mode-btn" id="script-preview-mode-2">Short Form</button>
                <button class="mode-btn" id="script-preview-mode-3">✦ Story Mode</button>
              </div>
            </div>
          </div>
          <div class="onboarding-step" id="script-step-2">
            <div class="onboarding-step-meta">
              <span class="onboarding-step-num">02</span>
              <div class="onboarding-step-info">
                <h3 class="onboarding-step-title">Describe Niche</h3>
                <p class="onboarding-step-desc">Write your video concept or script outline.</p>
              </div>
            </div>
            <div class="onboarding-step-preview">
              <div class="input-shell" style="padding: 12px 16px; margin: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.04); background: #fff; width: 100%;">
                <div style="font-size: 13.5px; color: var(--text); min-height: 24px; text-align: left; font-family: var(--font);">
                  <span id="script-preview-prompt-text"></span><span class="onboarding-cursor">|</span>
                </div>
              </div>
            </div>
          </div>
          <div class="onboarding-step" id="script-step-3">
            <div class="onboarding-step-meta">
              <span class="onboarding-step-num">03</span>
              <div class="onboarding-step-info">
                <h3 class="onboarding-step-title">Generate Script</h3>
                <p class="onboarding-step-desc">Review your generated script sections.</p>
              </div>
            </div>
            <div class="onboarding-step-preview" style="background: transparent; border: none; box-shadow: none; padding: 0; min-height: auto;">
              <div class="section-card" id="script-preview-card" style="margin: 0; pointer-events: none; width: 100%; transition: opacity 0.5s ease, transform 0.5s ease; opacity: 0; transform: translateY(4px); box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: left;">
                <div class="sec-label" style="font-family: var(--mono); text-transform: uppercase;">✦ Story Mode</div>
                <div class="sec-content" style="font-size: 13.5px; margin-top: 4px; line-height: 1.5;">
                  <strong>Hook:</strong> You've been using AI wrong this entire time. The creators actually winning? They use it to think.
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    this.canvasContainer.appendChild(this.onboardingContainer);

    // Listeners
    if (this.inputEl) {
      this.inputEl.addEventListener('focus', () => this.handleInputFocus());
      this.inputEl.addEventListener('blur', () => this.handleInputBlur());
    }

    // Motion preference listener
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    try {
      motionQuery.addEventListener('change', () => this.evaluateState());
    } catch (e) {
      motionQuery.addListener(() => this.evaluateState());
    }

    // Initial evaluation
    this.evaluateState();
  }

  isCanvasEmpty() {
    if (this.name === 'hook') {
      const emptyStateEl = document.getElementById('hooksEmptyState');
      return !!emptyStateEl && emptyStateEl.style.opacity !== '0';
    } else if (this.name === 'script') {
      const canvasEmpty = document.getElementById('canvasEmpty');
      return !!canvasEmpty && canvasEmpty.style.display !== 'none';
    }
    return false;
  }

  evaluateState() {
    const isEmpty = this.isCanvasEmpty();

    if (isEmpty && !this.isGenerating && !this.isInputFocused) {
      // Hide default examples
      if (this.emptyStateEl) {
        this.emptyStateEl.style.display = 'none';
      }

      // Show onboarding container
      if (this.onboardingContainer) {
        this.onboardingContainer.style.display = 'flex';
        requestAnimationFrame(() => {
          this.onboardingContainer.style.opacity = '1';
        });
      }

      if (!this.isActive) {
        this.startOnboardingCycle();
      }
    } else {
      // Hide onboarding container
      if (this.onboardingContainer) {
        this.onboardingContainer.style.opacity = '0';
        this.onboardingContainer.style.display = 'none';
      }

      this.stopOnboardingCycle();

      if (!isEmpty) {
        if (this.emptyStateEl) {
          this.emptyStateEl.style.display = 'none';
        }
      }
    }
  }

  handleInputFocus() {
    this.isInputFocused = true;
    this.evaluateState();
  }

  handleInputBlur() {
    this.isInputFocused = false;
    setTimeout(() => {
      this.evaluateState();
    }, 1500);
  }

  setGenerating(isGen) {
    this.isGenerating = isGen;
    if (isGen) {
      if (this.onboardingContainer) {
        this.onboardingContainer.style.opacity = '0';
        this.onboardingContainer.style.display = 'none';
      }
      this.stopOnboardingCycle();
    } else {
      setTimeout(() => {
        this.evaluateState();
      }, 1500);
    }
  }

  scheduleTimeout(fn, delay) {
    const handle = setTimeout(() => {
      this.timers = this.timers.filter(t => t !== handle);
      fn();
    }, delay);
    this.timers.push(handle);
    return handle;
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  startOnboardingCycle() {
    this.isActive = true;
    this.stepIndex = 1;
    this.runStepCycle();
  }

  stopOnboardingCycle() {
    this.isActive = false;
    this.clearTimers();
  }

  runStepCycle() {
    this.clearTimers();
    if (!this.isActive) return;

    const step1 = document.getElementById(`${this.name}-step-1`);
    const step2 = document.getElementById(`${this.name}-step-2`);
    const step3 = document.getElementById(`${this.name}-step-3`);
    
    const chip1 = document.getElementById(`${this.name}-preview-tone-1`) || document.getElementById(`${this.name}-preview-mode-1`);
    const chip2 = document.getElementById(`${this.name}-preview-tone-2`) || document.getElementById(`${this.name}-preview-mode-3`);
    const chip3 = document.getElementById(`${this.name}-preview-tone-3`) || document.getElementById(`${this.name}-preview-mode-2`);

    const textEl = document.getElementById(`${this.name}-preview-prompt-text`);
    const cardEl = document.getElementById(`${this.name}-preview-card`);

    const promptText = this.name === 'hook' 
      ? "I lost $40,000 following productivity advice. Here's what works."
      : "You've been using AI wrong this entire time. The creators actually winning? They use it to think.";

    const showStep1 = () => {
      if (!this.isActive) return;

      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (step1) step1.classList.add('active');
      if (step2) step2.classList.remove('active');
      if (step3) step3.classList.remove('active');

      if (chip1) chip1.classList.add('active');
      if (chip2) chip2.classList.remove('active');
      if (chip3) chip3.classList.remove('active');

      if (textEl) textEl.textContent = "";
      if (cardEl) {
        if (isReduced) {
          cardEl.style.transition = "none";
          cardEl.style.opacity = "0";
          cardEl.style.transform = "none";
        } else {
          cardEl.style.opacity = "0";
          cardEl.style.transform = "translateY(4px)";
        }
      }

      if (isReduced) {
        if (chip1) chip1.classList.remove('active');
        if (chip2) chip2.classList.add('active');
        this.scheduleTimeout(showStep2, 2000);
      } else {
        this.scheduleTimeout(() => {
          if (chip1) chip1.classList.remove('active');
          if (chip2) chip2.classList.add('active');
        }, 500);
        this.scheduleTimeout(showStep2, 1600);
      }
    };

    const showStep2 = () => {
      if (!this.isActive) return;

      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (step1) step1.classList.remove('active');
      if (step2) step2.classList.add('active');
      if (step3) step3.classList.remove('active');

      if (chip1) chip1.classList.remove('active');
      if (chip2) chip2.classList.add('active');

      if (isReduced) {
        if (textEl) textEl.textContent = promptText;
        this.scheduleTimeout(showStep3, 2000);
      } else {
        let index = 0;
        const typeChar = () => {
          if (!this.isActive) return;
          if (index < promptText.length) {
            if (textEl) textEl.textContent = promptText.slice(0, index + 1);
            index++;
            const charDelay = 35 + Math.random() * 20;
            this.scheduleTimeout(typeChar, charDelay);
          } else {
            this.scheduleTimeout(showStep3, 800);
          }
        };
        this.scheduleTimeout(typeChar, 300);
      }
    };

    const showStep3 = () => {
      if (!this.isActive) return;

      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (step1) step1.classList.remove('active');
      if (step2) step2.classList.remove('active');
      if (step3) step3.classList.add('active');

      if (cardEl) {
        if (isReduced) {
          cardEl.style.transition = "none";
          cardEl.style.opacity = "1";
          cardEl.style.transform = "none";
        } else {
          cardEl.style.opacity = "1";
          cardEl.style.transform = "translateY(0)";
        }
      }

      this.scheduleTimeout(() => {
        if (cardEl) {
          if (isReduced) {
            cardEl.style.transition = "none";
            cardEl.style.opacity = "0";
          } else {
            cardEl.style.opacity = "0";
          }
        }
        this.scheduleTimeout(() => {
          if (this.isActive) {
            showStep1();
          }
        }, isReduced ? 0 : 400);
      }, 4000);
    };

    showStep1();
  }

}

document.addEventListener('creo:partials-loaded', () => {
  const hookBoard = document.querySelector('.hook-board');
  const hooksEmptyState = document.getElementById('hooksEmptyState');
  const hookInput = document.getElementById('hookGeneratorInput');

  if (hookBoard) {
    window.hookEmptyStateManager = new CanvasEmptyStateManager(hookBoard, hooksEmptyState, hookInput, null, 'hook');
  }

  const scriptCanvas = document.querySelector('.script-canvas');
  const scriptEmptyState = document.getElementById('scriptEmptyState');
  const scriptInput = document.getElementById('mainInput');

  if (scriptCanvas) {
    window.scriptEmptyStateManager = new CanvasEmptyStateManager(scriptCanvas, scriptEmptyState, scriptInput, null, 'script');
  }
});
