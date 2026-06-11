const HOOK_TONES = [
  'Energetic',
  'Educational',
  'Dramatic',
  'Controversial',
  'Storytelling',
  'Authority'
];

const HOOK_TONE_EMOJIS = {
  'Energetic': '⚡',
  'Dramatic': '🎭',
  'Educational': '📚',
  'Controversial': '🔥',
  'Storytelling': '📖',
  'Authority': '💡'
};

let activeHookTone = 'Energetic';

function buildHookToneStrip() {
  const strip = document.getElementById('hookToneStrip');
  if (!strip) return;

  strip.innerHTML = HOOK_TONES.map(t => {
    const emoji = HOOK_TONE_EMOJIS[t] || '';
    return `<button class="tone-chip ${t === activeHookTone ? 'active' : ''}" onclick="selectHookTone('${t}', this)">${emoji} ${t}</button>`;
  }).join('');
}

function selectHookTone(tone, el) {
  activeHookTone = tone;
  document.querySelectorAll('#hookToneStrip .tone-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

window.getHookStudioContext = function () {
  return {
    topic: document.getElementById('hookGeneratorInput')?.value.trim() || '',
    tone: activeHookTone
  };
};

async function generateHooks() {
  const input = document.getElementById('hookGeneratorInput');
  const topic = input?.value.trim() || '';
  if (!topic) {
    input?.focus();
    return;
  }

  const btn = document.getElementById('generateHookBtn');
  const icon = document.getElementById('generateHookIcon');
  const hooksContent = document.getElementById('hooksContent');
  const boardSub = document.getElementById('hookBoardSub');
  const stateLine = document.getElementById('hookStateLine');

  if (btn) btn.disabled = true;
  if (icon) icon.innerHTML = '<div class="spinner"></div>';
  if (boardSub) boardSub.textContent = 'Generating';
  
  if (window.hookEmptyStateManager) {
    window.hookEmptyStateManager.setGenerating(true);
  }
  
  if (stateLine) {
    stateLine.textContent = "Generating your hooks...";
    stateLine.style.display = 'block';
    stateLine.style.opacity = '1';
  }

  // Set examples to loading opacity
  const examples = document.getElementById('hooksEmptyState');
  if (examples) {
    examples.style.opacity = '0.25';
  }

  if (typeof window.setLiveBadgeLoading === 'function') {
    window.setLiveBadgeLoading(true);
  }

  try {
    const res = await fetch('/api/generate-hooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, tone: activeHookTone })
    });

    if (!res.ok) {
      if (res.status === 401) return window.Auth.logout();
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Hook generation failed');
    }

    const data = await res.json();
    const hooks = data.hooks || [];

    // Hide state line on success
    if (stateLine) {
      stateLine.style.opacity = '0';
      setTimeout(() => { stateLine.style.display = 'none'; }, 150);
    }

    renderHooks(hooks, data.bestHook);
    window.latestGeneratedHooks = { hooks, bestHook: data.bestHook || hooks[0] || '' };
    if (boardSub) boardSub.textContent = data.angle || '5 angles';

    const bestHook = data.bestHook || hooks[0];
    if (bestHook) await testHookText(bestHook);
  } catch (err) {
    console.error('Hook Generation Error:', err);
    window.showToast("Hook Generation Failed", err.message, "error");
    if (boardSub) boardSub.textContent = 'Error';

    if (stateLine) {
      stateLine.textContent = "Something went wrong. Try again.";
      stateLine.style.display = 'block';
      stateLine.style.opacity = '1';
    }

    // Restore examples opacity on failure
    if (examples) {
      examples.style.opacity = '0.55';
    }

    if (hooksContent && !window.latestGeneratedHooks?.hooks?.length) {
      renderExampleHooks();
    }
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    if (typeof window.setLiveBadgeLoading === 'function') {
      window.setLiveBadgeLoading(false);
    }
    if (window.hookEmptyStateManager) {
      window.hookEmptyStateManager.setGenerating(false);
    }
  }
}

function renderExampleHooks() {
  const el = document.getElementById('hooksContent');
  if (!el) return;
  el.innerHTML = `
    <div id="hooksEmptyState" class="flex flex-col gap-3.5 w-full transition-opacity duration-200" style="opacity: 0.55; pointer-events: none;">
      <!-- Card 1 -->
      <div class="hook-item best relative border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">
        <span class="absolute top-3 right-3 bg-slate-100 text-slate-400 text-[10px] font-medium rounded-full px-2 py-0.5">example</span>
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center gap-2">
            <span class="hook-best-label bg-blue-50 text-blue-600 border border-blue-100 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider" style="margin-bottom:0; font-family: var(--mono);">Controversial</span>
            <span class="bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full px-1.5 py-0.5 inline-flex items-center justify-center" style="font-family: var(--mono);">94</span>
          </div>
          <div class="hook-text text-sm font-normal text-slate-600">"I lost $40,000 following every productivity guru's advice. Here's what actually works."</div>
        </div>
      </div>
      <!-- Card 2 -->
      <div class="hook-item relative border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">
        <span class="absolute top-3 right-3 bg-slate-100 text-slate-400 text-[10px] font-medium rounded-full px-2 py-0.5">example</span>
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center gap-2">
            <span class="hook-best-label bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider" style="margin-bottom:0; color: #4f46e5; border-color: #e0e7ff; background-color: #f5f3ff; font-family: var(--mono);">Authority</span>
            <span class="bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-full px-1.5 py-0.5 inline-flex items-center justify-center" style="color: #4f46e5; background-color: #e0e7ff; font-family: var(--mono);">91</span>
          </div>
          <div class="hook-text text-sm font-normal text-slate-600">"Nobody talks about the real reason your YouTube channel isn't growing — and it's not the algorithm."</div>
        </div>
      </div>
    </div>
  `;
}

function renderHooks(hooks, bestHookText) {
  const el = document.getElementById('hooksContent');
  const countEl = document.getElementById('hookCount');
  if (!el) return;

  if (!hooks || hooks.length === 0) {
    renderExampleHooks();
    if (countEl) countEl.style.display = 'none';
    return;
  }

  if (countEl) {
    countEl.textContent = hooks.length;
    countEl.style.display = 'inline-flex';
  }

  const emptyEl = document.getElementById('hooksEmptyState');
  if (emptyEl) {
    emptyEl.style.opacity = '0';
    setTimeout(() => {
      renderReal();
    }, 200);
  } else {
    renderReal();
  }

  function renderReal() {
    el.innerHTML = `<div class="hooks-list">${hooks.map((h, i) => {
      const text = typeof h === 'string' ? h : (h.text || h.hook || JSON.stringify(h));
      const isBest = bestHookText ? (text === bestHookText) : (i === 0);
      const escaped = escapeJsString(text);
      const safeText = escapeHtml(text);

      return `
        <div class="hook-item ${isBest ? 'best' : ''}" style="animation-delay:${i * 0.08}s">
          <div style="flex:1;min-width:0;">
            ${isBest ? '<div class="hook-best-label">Best</div>' : ''}
            <div class="hook-text">${safeText}</div>
            <button class="hook-test-inline-btn" onclick="testGeneratedHook(event, \`${escaped}\`)">
              <i class="fa-solid fa-gauge-simple-high"></i>
              Test
            </button>
          </div>
          <button class="hook-copy-btn" onclick="copyHook(this, \`${escaped}\`)">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>`;
    }).join('')}</div>`;
  }
}

window.renderHooks = renderHooks;

function initHookStudio() {
  buildHookToneStrip();

  // Rotating tips when idle
  const tips = [
    "Best hooks create a knowledge gap in the first 3 words",
    "Controversial hooks get 2x more clicks than educational ones",
    "Start with a number — specificity builds trust instantly"
  ];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  const testerResult = document.getElementById('hookTesterResult');
  if (testerResult) {
    testerResult.innerHTML = `
      <div class="flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs italic">
        "${randomTip}"
      </div>
    `;
  }

  const latest = window.latestGeneratedHooks;
  if (latest?.hooks?.length && document.getElementById('hooksContent')) {
    renderHooks(latest.hooks, latest.bestHook);
  }

  document.getElementById('hookGeneratorInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateHooks();
    }
  });
}

if (document.getElementById('hook-view')) {
  initHookStudio();
} else {
  document.addEventListener('creo:partials-loaded', initHookStudio, { once: true });
}
