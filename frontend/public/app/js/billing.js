/**
 * Aurora — Billing & Usage Controller
 * Single Page Application logic in vanilla JS
 */

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

async function loadBillingData() {
  const billUsed = document.getElementById('billUsed');
  const billLimit = document.getElementById('billLimit');
  const billProgressBar = document.getElementById('billProgressBar');
  const billRemaining = document.getElementById('billRemaining');
  const billPercent = document.getElementById('billPercent');
  const billPlanName = document.getElementById('billPlanName');
  const billPlanStatusSub = document.getElementById('billPlanStatusSub');

  const cardPro = document.getElementById('planCardPro');
  const cardCreator = document.getElementById('planCardCreator');

  try {
    const res = await fetch('/auth/me');
    if (!res.ok) {
      if (res.status === 401 && window.Auth?.logout) return window.Auth.logout();
      throw new Error('Failed to load billing status.');
    }
    const data = await res.json();
    const user = data.user;
    if (!user) return;

    // Quota statistics
    const used = user.generationsUsed || 0;
    const limit = user.generationLimit || 20;
    const isCreator = String(user.plan || '').toLowerCase() === 'creator';
    const remaining = isCreator ? 'Unlimited' : Math.max(0, limit - used);
    const percent = isCreator ? Math.min(100, Math.round((used / 1000) * 100)) : Math.min(100, Math.round((used / limit) * 100));

    if (billUsed) billUsed.textContent = used;
    if (billLimit) billLimit.textContent = isCreator ? 'Unlimited' : limit;
    if (billProgressBar) billProgressBar.style.width = `${percent}%`;
    if (billRemaining) billRemaining.textContent = remaining;
    if (billPercent) billPercent.textContent = isCreator ? '--' : `${percent}%`;

    // Active Plan details
    const planName = String(user.plan || 'trial').toLowerCase();
    const prettyPlanName = planName.charAt(0).toUpperCase() + planName.slice(1);
    
    if (billPlanName) {
      billPlanName.textContent = prettyPlanName + ' Tier';
    }

    let statusSubText = '';
    if (planName === 'trial') {
      statusSubText = user.trialEndsAt 
        ? `Your 7-day free trial ends on ${formatDate(user.trialEndsAt)}`
        : 'You are currently on a 7-day free trial.';
    } else {
      statusSubText = user.renewalDate
        ? `Your subscription is active and renews on ${formatDate(user.renewalDate)}`
        : `Your subscription is active.`;
    }

    if (billPlanStatusSub) {
      billPlanStatusSub.textContent = statusSubText;
    }

    // Update Plan Comparison Cards to show current status
    if (cardPro) {
      const btn = cardPro.querySelector('button');
      if (planName === 'pro') {
        cardPro.style.borderColor = 'var(--green)';
        if (btn) {
          btn.textContent = 'Current Plan';
          btn.disabled = true;
          btn.style.background = 'var(--surface2)';
          btn.style.color = 'var(--muted)';
          btn.style.borderColor = 'var(--border)';
        }
      } else {
        cardPro.style.borderColor = 'var(--border)';
        if (btn) {
          btn.textContent = 'Upgrade to Pro';
          btn.disabled = false;
          btn.style.background = '';
          btn.style.color = '';
          btn.style.borderColor = '';
        }
      }
    }

    if (cardCreator) {
      const btn = cardCreator.querySelector('button');
      if (planName === 'creator') {
        cardCreator.style.borderColor = 'var(--green)';
        if (btn) {
          btn.textContent = 'Current Plan';
          btn.disabled = true;
          btn.style.background = 'var(--surface2)';
          btn.style.color = 'var(--muted)';
          btn.style.borderColor = 'var(--border)';
        }
      } else {
        cardCreator.style.borderColor = 'var(--accent-border)';
        if (btn) {
          btn.textContent = 'Upgrade to Creator';
          btn.disabled = false;
          btn.style.background = 'var(--accent)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'var(--accent)';
        }
      }
    }

  } catch (err) {
    console.error('Billing data loading error:', err);
  }
}

async function triggerUpgradePlan(planName) {
  const prettyName = planName.charAt(0).toUpperCase() + planName.slice(1);
  if (!confirm(`Are you sure you want to change your subscription to the ${prettyName} Plan?`)) {
    return;
  }

  try {
    const res = await fetch('/api/user/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planName })
    });

    if (!res.ok) {
      if (res.status === 401 && window.Auth?.logout) return window.Auth.logout();
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Upgrade failed.');
    }

    const data = await res.json();
    if (data.success) {
      window.showToast("Subscription Updated", `Successfully subscribed to the ${prettyName} Plan! Your generation limits have been updated.`, "success");
      
      // Reload UI across views
      loadBillingData();
      
      if (typeof window.loadDashboardData === 'function') {
        window.loadDashboardData();
      }
      if (typeof window.loadCurrentUser === 'function') {
        window.loadCurrentUser();
      }
      if (typeof window.hideUpgradeModal === 'function') {
        window.hideUpgradeModal();
      }
    }
  } catch (err) {
    console.error(err);
    window.showToast("Subscription Failed", err.message || 'Error updating subscription. Please try again.', "error");
  }
}

function selectBillingPlan(planName) {
  // Option to select card before confirming (optional click helper)
  const cardPro = document.getElementById('planCardPro');
  const cardCreator = document.getElementById('planCardCreator');

  if (planName === 'pro' && cardPro) {
    cardPro.style.borderColor = 'var(--accent)';
    if (cardCreator && cardCreator.style.borderColor !== 'var(--green)') {
      cardCreator.style.borderColor = 'var(--accent-border)';
    }
  } else if (planName === 'creator' && cardCreator) {
    cardCreator.style.borderColor = 'var(--accent)';
    if (cardPro && cardPro.style.borderColor !== 'var(--green)') {
      cardPro.style.borderColor = 'var(--border)';
    }
  }
}

function initBilling() {
  loadBillingData();
}

if (document.getElementById('billing-view')) {
  initBilling();
} else {
  document.addEventListener('creo:partials-loaded', initBilling, { once: true });
}

// Expose handlers globally
window.triggerUpgradePlan = triggerUpgradePlan;
window.selectBillingPlan = selectBillingPlan;
window.loadBillingData = loadBillingData;
