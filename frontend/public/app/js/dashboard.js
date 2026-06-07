/**
 * Aurora — Dashboard Controller
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

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadDashboardData() {
  const dashUserFirstName = document.getElementById('dashUserFirstName');
  const dashPlanName = document.getElementById('dashPlanName');
  const dashPlanSubtext = document.getElementById('dashPlanSubtext');
  const dashGenerationsUsed = document.getElementById('dashGenerationsUsed');
  const dashGenerationsLimit = document.getElementById('dashGenerationsLimit');
  const dashGenerationsBar = document.getElementById('dashGenerationsBar');
  const dashGenerationsRemaining = document.getElementById('dashGenerationsRemaining');
  const dashAccountStatus = document.getElementById('dashAccountStatus');
  const dashRenewalText = document.getElementById('dashRenewalText');
  const dashRecentScripts = document.getElementById('dashRecentScripts');
  const dashRecentAudits = document.getElementById('dashRecentAudits');

  try {
    // 1. Fetch User Data
    const response = await fetch('/auth/me');
    if (!response.ok) {
      if (response.status === 401 && window.Auth?.logout) {
        return window.Auth.logout();
      }
      throw new Error('Failed to load user profile');
    }
    const data = await response.json();
    const user = data.user;

    if (!user) return;

    // 2. Populate Metrics Cards
    if (dashUserFirstName) {
      dashUserFirstName.textContent = user.firstName || 'Creator';
    }

    const planName = String(user.plan || 'trial').toLowerCase();
    const prettyPlanName = planName.charAt(0).toUpperCase() + planName.slice(1);
    
    if (dashPlanName) {
      dashPlanName.textContent = prettyPlanName;
    }

    let planSubtext = 'Free plan';
    let renewalTextStr = 'Renews --';

    if (planName === 'trial') {
      if (user.trialEndsAt) {
        const diffTime = new Date(user.trialEndsAt) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, diffDays);
        planSubtext = `${daysLeft} days left in trial`;
        renewalTextStr = `Ends: ${formatDate(user.trialEndsAt)}`;
      } else {
        planSubtext = '7-day free trial';
        renewalTextStr = 'Ends --';
      }
    } else {
      planSubtext = `${prettyPlanName} Subscription`;
      if (user.renewalDate) {
        renewalTextStr = `Renews: ${formatDate(user.renewalDate)}`;
      } else if (user.createdAt) {
        // Fallback: estimate renewal 30 days after signup or current month
        const created = new Date(user.createdAt);
        created.setDate(created.getDate() + 30);
        renewalTextStr = `Renews: ${formatDate(created)}`;
      } else {
        renewalTextStr = 'Active subscription';
      }
    }

    if (dashPlanSubtext) {
      dashPlanSubtext.textContent = planSubtext;
    }
    if (dashRenewalText) {
      dashRenewalText.textContent = renewalTextStr;
    }

    const used = user.generationsUsed || 0;
    const limit = user.generationLimit || 20;
    const isCreator = String(user.plan || '').toLowerCase() === 'creator';
    const remaining = isCreator ? 'Unlimited' : Math.max(0, limit - used);
    const percent = isCreator ? Math.min(100, Math.round((used / 1000) * 100)) : Math.min(100, Math.round((used / limit) * 100));

    if (dashGenerationsUsed) dashGenerationsUsed.textContent = used;
    if (dashGenerationsLimit) dashGenerationsLimit.textContent = isCreator ? 'Unlimited' : limit;
    if (dashGenerationsBar) dashGenerationsBar.style.width = `${percent}%`;
    if (dashGenerationsRemaining) {
      dashGenerationsRemaining.textContent = isCreator ? 'Unlimited generations left' : `${remaining} generations left`;
    }

    if (dashAccountStatus) {
      const status = user.subscriptionStatus || 'active';
      const prettyStatus = status.charAt(0).toUpperCase() + status.slice(1);
      dashAccountStatus.textContent = prettyStatus;
      if (status === 'active') {
        dashAccountStatus.style.color = 'var(--green)';
      } else {
        dashAccountStatus.style.color = 'var(--red)';
      }
    }

    // Update global sidebar plan/limits info too
    const sidebarPlanText = document.querySelector('.sidebar-upgrade .upgrade-label');
    if (sidebarPlanText) {
      sidebarPlanText.textContent = `You're on ${prettyPlanName}`;
    }
    const sidebarPlanDetails = document.querySelector('.sidebar-upgrade .upgrade-title');
    if (sidebarPlanDetails) {
      sidebarPlanDetails.textContent = planName === 'trial' ? 'Unlock premium studio features' : 'Your studio is unlocked';
    }
    const sidebarUserPlan = document.querySelector('.user-plan');
    if (sidebarUserPlan) {
      sidebarUserPlan.textContent = isCreator 
        ? `${prettyPlanName} · Unlimited` 
        : `${prettyPlanName} · ${remaining} left`;
    }

    // 3. Fetch & Render Saved Scripts
    const scriptsRes = await fetch('/api/scripts');
    let scripts = [];
    if (scriptsRes.ok) {
      scripts = await scriptsRes.json();
    }

    if (dashRecentScripts) {
      if (scripts.length === 0) {
        dashRecentScripts.innerHTML = `
          <div class="premium-empty-state">
            <div class="premium-empty-icon"><i class="fa-solid fa-pen-nib"></i></div>
            <h4>No scripts generated yet</h4>
            <p>Generate your first video script with our high-retention AI model in the studio.</p>
            <button class="btn-primary btn-sm" onclick="navigateToScriptStudio()">Go to Script Studio</button>
          </div>
        `;
      } else {
        const recentScripts = scripts.slice(0, 5);
        dashRecentScripts.innerHTML = `
          <div class="recent-list">
            ${recentScripts.map(script => {
              const scriptId = script._id || '';
              const safeTopic = escapeHtml(script.topic || 'Untitled Script');
              const typeLabel = script.type === 'long' ? 'Long-form' : (script.type === 'storytelling' ? 'Story' : 'Short-form');
              const platformLabel = script.platform ? ` · ${escapeHtml(script.platform)}` : '';
              return `
                <div class="recent-item">
                  <div class="recent-item-info">
                    <span class="recent-item-title" title="${safeTopic}">${safeTopic}</span>
                    <div class="recent-item-meta">
                      <span><i class="fa-regular fa-clock" style="margin-right:3px;"></i>${escapeHtml(script.estimatedDuration || '--')}</span>
                      <span>${typeLabel}${platformLabel}</span>
                      <span>${formatDate(script.createdAt)}</span>
                    </div>
                  </div>
                  <div class="recent-item-action">
                    <button class="btn-ghost btn-sm" onclick="loadScriptToStudio('${scriptId}')" title="Open in Studio">
                      <i class="fa-solid fa-folder-open" style="font-size:13px;"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Cache the scripts globally so we can load them quickly when clicked
        window.cachedDashboardScripts = scripts;
      }
    }

    // 4. Fetch & Render Recent competitor scans
    const auditsRes = await fetch('/api/channel/recent');
    let audits = [];
    if (auditsRes.ok) {
      audits = await auditsRes.json();
    }

    if (dashRecentAudits) {
      if (audits.length === 0) {
        dashRecentAudits.innerHTML = `
          <div class="premium-empty-state">
            <div class="premium-empty-icon"><i class="fa-brands fa-youtube"></i></div>
            <h4>No audited channels yet</h4>
            <p>Analyze any competitor YouTube handle or link to view their niches and velocity metrics.</p>
            <button class="btn-primary btn-sm" onclick="navigateToChannelAnalysis()">Start Audit</button>
          </div>
        `;
      } else {
        const recentAudits = audits.slice(0, 5);
        dashRecentAudits.innerHTML = `
          <div class="recent-list">
            ${recentAudits.map(audit => {
              const channelId = audit.channelId || '';
              const safeName = escapeHtml(audit.channelName || 'YouTube Channel');
              const niche = audit.niche ? escapeHtml(audit.niche) : 'General';
              const score = audit.healthScore || '--';
              const avatar = audit.thumbnailUrl || '../assets/default-channel.png';
              
              return `
                <div class="recent-item">
                  <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                    <img src="${avatar}" alt="${safeName}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border-soft);flex-shrink:0;">
                    <div class="recent-item-info">
                      <span class="recent-item-title" title="${safeName}">${safeName}</span>
                      <div class="recent-item-meta">
                        <span>Niche: ${niche}</span>
                        <span>Health: ${score}</span>
                      </div>
                    </div>
                  </div>
                  <div class="recent-item-action">
                    <button class="btn-ghost btn-sm" onclick="loadAuditToReport('${channelId}')" title="View Audit Report">
                      <i class="fa-solid fa-chart-line" style="font-size:13px;"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

  } catch (err) {
    console.error('Dashboard loading error:', err);
  }
}

// Navigation helpers
function navigateToScriptStudio() {
  const btn = document.querySelector('[data-target="script-view"]');
  if (btn) {
    switchView(btn);
  }
}

function navigateToChannelAnalysis() {
  const btn = document.querySelector('[data-target="channel-analysis-view"]');
  if (btn) {
    switchView(btn);
  }
}

function loadScriptToStudio(scriptId) {
  if (!window.cachedDashboardScripts) return;
  const script = window.cachedDashboardScripts.find(s => s._id === scriptId);
  if (!script) return;

  // 1. Switch view to Script Studio
  const btn = document.querySelector('[data-target="script-view"]');
  if (btn) switchView(btn);

  // 2. Set mode to match script type
  if (typeof window.setStudioMode === 'function') {
    window.setStudioMode(script.type);
  }

  // 3. Fill the main topic input
  const mainInput = document.getElementById('mainInput');
  if (mainInput) mainInput.value = script.topic || '';

  // 4. Highlight the tone chip
  if (script.tone) {
    const chips = document.querySelectorAll('#toneStrip .tone-chip');
    chips.forEach(c => {
      if (c.textContent.trim() === script.tone) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
    if (typeof window.selectTone === 'function') {
      // Set the activeTone variable inside script-studio.js context
      window.activeTone = script.tone;
    }
  }

  // 5. Load inputs into optionsState so they are preserved
  if (script.inputs && window.settingsState) {
    const mode = script.type;
    if (window.settingsState[mode]) {
      Object.assign(window.settingsState[mode], script.inputs);
    }
  }

  // 6. Render the script result
  if (typeof window.renderScriptResult === 'function') {
    window.renderScriptResult({
      script: script.scriptContent,
      metadata: {
        type: script.type,
        wordCount: script.wordCount,
        estimatedDuration: script.estimatedDuration
      }
    });
  }
}

function loadAuditToReport(channelId) {
  // 1. Switch view to Channel Analysis
  const btn = document.querySelector('[data-target="channel-analysis-view"]');
  if (btn) switchView(btn);

  // 2. Load the cached report
  if (typeof window.fetchAndDisplayCachedReport === 'function') {
    window.fetchAndDisplayCachedReport(channelId);
  }
}

// Initialization
function initDashboard() {
  loadDashboardData();
}

if (document.getElementById('dashboard-view')) {
  initDashboard();
} else {
  document.addEventListener('creo:partials-loaded', initDashboard, { once: true });
}

// Expose handlers globally
window.loadScriptToStudio = loadScriptToStudio;
window.loadAuditToReport = loadAuditToReport;
window.navigateToScriptStudio = navigateToScriptStudio;
window.navigateToChannelAnalysis = navigateToChannelAnalysis;
window.loadDashboardData = loadDashboardData;
