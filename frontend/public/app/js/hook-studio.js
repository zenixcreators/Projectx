const HOOK_TONES = [
  'Energetic',
  'Educational',
  'Dramatic',
  'Controversial',
  'Storytelling',
  'Authority'
];

let activeHookTone = 'Energetic';

function buildHookToneStrip() {
  const strip = document.getElementById('hookToneStrip');
  if (!strip) return;

  strip.innerHTML = HOOK_TONES.map(t =>
    `<button class="tone-chip ${t === activeHookTone ? 'active' : ''}" onclick="selectHookTone('${t}', this)">${t}</button>`
  ).join('');
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

  if (btn) btn.disabled = true;
  if (icon) icon.innerHTML = '<div class="spinner"></div>';
  if (boardSub) boardSub.textContent = 'Generating';
  if (hooksContent) {
    hooksContent.innerHTML = '<div class="hooks-empty-state hooks-empty-large"><div class="spinner" style="margin:0 auto 8px;"></div>Generating hooks...</div>';
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
    renderHooks(hooks, data.bestHook);
    window.latestGeneratedHooks = { hooks, bestHook: data.bestHook || hooks[0] || '' };
    if (boardSub) boardSub.textContent = data.angle || '5 angles';

    const bestHook = data.bestHook || hooks[0];
    if (bestHook) await testHookText(bestHook);
  } catch (err) {
    console.error('Hook Generation Error:', err);
    window.showToast("Hook Generation Failed", err.message, "error");
    if (boardSub) boardSub.textContent = 'Error';
    if (hooksContent) {
      hooksContent.innerHTML = '<div class="hooks-empty-state hooks-empty-large"><div class="ei"><i class="fa-solid fa-triangle-exclamation"></i></div>Could not generate hooks</div>';
    }
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  }
}

function initHookStudio() {
  buildHookToneStrip();

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
