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
    const sidebarUpgradeBtn = document.querySelector('.sidebar-upgrade .upgrade-btn');
    if (sidebarUpgradeBtn) {
      if (planName === 'trial') {
        sidebarUpgradeBtn.style.display = '';
      } else {
        sidebarUpgradeBtn.style.display = 'none';
      }
    }
    const topbarUpgradeBtn = document.getElementById('topbarUpgradeBtn');
    if (topbarUpgradeBtn) {
      if (planName === 'creator') {
        topbarUpgradeBtn.style.display = 'none';
      } else {
        topbarUpgradeBtn.style.display = '';
      }
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
          <div class="relative overflow-hidden rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-transparent to-purple-50/10">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,92,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>
            
            <div class="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 text-2xl mb-4 relative z-10 shadow-inner">
              <i class="fa-solid fa-signature"></i>
            </div>
            
            <h4 class="text-base font-semibold text-gray-900 mb-1 relative z-10">Your first script is one click away</h4>
            <p class="text-xs text-gray-500 max-w-sm mb-5 relative z-10">Generate a high-retention video script with our advanced creator AI.</p>
            
            <button class="relative z-10 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer border-none" onclick="navigateToScriptStudio()">
              <span>Go to Script Studio</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        `;
      } else {
        const recentScripts = scripts.slice(0, 5);
        dashRecentScripts.innerHTML = `
          <div class="flex flex-col gap-2.5">
            ${recentScripts.map(script => {
              const scriptId = script._id || '';
              const safeTopic = escapeHtml(script.topic || 'Untitled Script');
              const typeLabel = script.type === 'long' ? 'Long-form' : (script.type === 'storytelling' ? 'Story' : 'Short-form');
              const platformLabel = script.platform ? ` · ${escapeHtml(script.platform)}` : '';
              return `
                <div class="flex items-center justify-between p-3.5 hover:bg-gray-50/80 rounded-xl border border-transparent hover:border-gray-100 hover:shadow-sm transition-all duration-200 hover:-translate-y-[1px]">
                  <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span class="text-sm font-semibold text-gray-900 truncate" title="${safeTopic}">${safeTopic}</span>
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                      <span class="flex items-center gap-1 text-gray-400 font-medium">
                        <i class="fa-regular fa-clock text-[11px]"></i>
                        ${escapeHtml(script.estimatedDuration || '--')}
                      </span>
                      <span class="text-gray-300">•</span>
                      <span>${typeLabel}${platformLabel}</span>
                      <span class="text-gray-300">•</span>
                      <span>${formatDate(script.createdAt)}</span>
                    </div>
                  </div>
                  <div class="flex-shrink-0 ml-3">
                    <button class="w-8 h-8 rounded-lg border border-gray-150 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-50 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer" onclick="loadScriptToStudio('${scriptId}')" title="Open in Studio">
                      <i class="fa-solid fa-folder-open text-xs"></i>
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
          <div class="relative overflow-hidden rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-transparent to-rose-50/10">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.03)_0%,transparent_70%)] pointer-events-none"></div>
            
            <div class="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 text-2xl mb-4 relative z-10 shadow-inner">
              <i class="fa-brands fa-youtube"></i>
            </div>
            
            <h4 class="text-base font-semibold text-gray-900 mb-1 relative z-10">Audit your first competitor channel</h4>
            <p class="text-xs text-gray-500 max-w-sm mb-5 relative z-10 font-normal">Analyze any creator channel to unlock their niches and velocity metrics.</p>
            
            <button class="relative z-10 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer border-none" onclick="navigateToChannelAnalysis()">
              <span>Start Channel Audit</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        `;
      } else {
        const recentAudits = audits.slice(0, 5);
        dashRecentAudits.innerHTML = `
          <div class="flex flex-col gap-2.5">
            ${recentAudits.map(audit => {
              const channelId = audit.channelId || '';
              const safeName = escapeHtml(audit.channelName || 'YouTube Channel');
              const niche = audit.niche ? escapeHtml(audit.niche) : 'General';
              const score = audit.healthScore || '--';
              const avatar = audit.thumbnailUrl || '../assets/default-channel.png';
              
              const numScore = Number(score) || 0;
              let scoreBadgeClass = 'bg-gray-50 text-gray-600 border-gray-100';
              if (score !== '--') {
                if (numScore >= 80) {
                  scoreBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100/50';
                } else if (numScore >= 60) {
                  scoreBadgeClass = 'bg-amber-50 text-amber-700 border-amber-100/50';
                } else {
                  scoreBadgeClass = 'bg-rose-50 text-rose-700 border-rose-100/50';
                }
              }
              
              return `
                <div class="flex items-center justify-between p-3.5 hover:bg-gray-50/80 rounded-xl border border-transparent hover:border-gray-100 hover:shadow-sm transition-all duration-200 hover:-translate-y-[1px]">
                  <div class="flex items-center gap-3.5 min-width-0 flex-1">
                    <img src="${avatar}" alt="${safeName}" class="w-9 h-9 rounded-full object-cover border border-gray-100 flex-shrink-0">
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="text-sm font-semibold text-gray-900 truncate" title="${safeName}">${safeName}</span>
                      <div class="flex items-center gap-2 text-xs text-gray-400">
                        <span>${niche}</span>
                        <span class="text-gray-300">•</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${scoreBadgeClass}">
                          <i class="fa-solid fa-heart-pulse text-[8.5px]"></i>
                          Score: ${score}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="flex-shrink-0 ml-3">
                    <button class="w-8 h-8 rounded-lg border border-gray-150 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-50 flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer" onclick="loadAuditToReport('${channelId}')" title="View Audit Report">
                      <i class="fa-solid fa-chart-line text-xs"></i>
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

function navigateToHookStudio() {
  const btn = document.querySelector('[data-target="hook-view"]');
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
