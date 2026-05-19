const TONES = [
  'Energetic',
  'Educational',
  'Dramatic',
  'Controversial',
  'Inspirational',
  'Storytelling',
  'Humorous',
  'Authority'
];

let activeTone = 'Energetic';
let latestScriptText = '';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeJsString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function buildScoreRingHtml(score) {
  const numScore = Math.max(0, Math.min(100, Number(score || 0)));
  
  // Dynamic color selection based on score range
  let color = 'var(--accent)'; // Purple for >= 85 (Excellent)
  if (numScore >= 70 && numScore < 85) color = '#10b981'; // Emerald Green (Good)
  else if (numScore >= 50 && numScore < 70) color = '#f59e0b'; // Amber Yellow (Fair)
  else if (numScore < 50) color = '#ef4444'; // Crimson Red (Poor)

  // Circumference for radius 34: 2 * Math.PI * 34 = 213.63
  const circumference = 213.63;
  const strokeDashoffset = circumference - (circumference * numScore) / 100;

  return `
    <div class="analysis-score-ring-wrapper" style="--score-color: ${color}">
      <svg class="score-ring-svg" viewBox="0 0 80 80">
        <circle class="score-ring-bg" cx="40" cy="40" r="34"></circle>
        <circle class="score-ring-progress" cx="40" cy="40" r="34" 
                stroke-dasharray="${circumference}" 
                stroke-dashoffset="${strokeDashoffset}"></circle>
      </svg>
      <div class="score-ring-text">
        <span class="score-number">${numScore}</span>
        <span class="score-label">score</span>
      </div>
    </div>`;
}

function buildToneStrip() {
  const strip = document.getElementById('toneStrip');
  if (!strip) return;

  strip.innerHTML = TONES.map(t =>
    `<button class="tone-chip ${t === activeTone ? 'active' : ''}" onclick="selectTone('${t}', this)">${t}</button>`
  ).join('');
}

function selectTone(tone, el) {
  activeTone = tone;
  document.querySelectorAll('#toneStrip .tone-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

async function triggerGenerate() {
  const inputEl = document.getElementById('mainInput');
  const topic = inputEl.value.trim();
  if (!topic) {
    inputEl.focus();
    return;
  }

  const btn = document.getElementById('generateBtn');
  const icon = document.getElementById('generateIcon');
  btn.disabled = true;
  icon.innerHTML = '<div class="spinner"></div>';

  let inputField = document.getElementById('input');
  let toneField = document.getElementById('tone');

  if (!inputField) {
    inputField = document.createElement('input');
    inputField.id = 'input';
    inputField.style.display = 'none';
    document.body.appendChild(inputField);
  }

  if (!toneField) {
    toneField = document.createElement('input');
    toneField.id = 'tone';
    toneField.style.display = 'none';
    document.body.appendChild(toneField);
  }

  inputField.value = topic;
  toneField.value = activeTone;

  document.getElementById('canvasEmpty').style.display = 'none';
  document.getElementById('sectionsGrid').style.display = 'none';
  document.getElementById('scriptMeta').style.display = 'none';
  document.getElementById('copyFullBtn').style.display = 'none';
  setScriptTesterStatus('Idle');
  const scriptTesterResult = document.getElementById('scriptTesterResult');
  if (scriptTesterResult) {
    scriptTesterResult.innerHTML = `
      <div class="analysis-empty-state">
        <div class="analysis-mini-score">--</div>
        <span>Waiting for script</span>
      </div>`;
  }

  try {
    if (typeof analyze === 'function') await analyze();
  } catch (e) {
    console.error(e);
  }

  btn.disabled = false;
  icon.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
}

window.renderScriptResult = function (data) {
  const grid = document.getElementById('sectionsGrid');

  const SECTION_CONFIG = [
    { key: 'hook', label: 'Hook', extraClass: 'hook-card-main' },
    { key: 'problem', label: 'Problem', extraClass: '' },
    { key: 'shift', label: 'Shift', extraClass: '' },
    { key: 'value', label: 'Value', extraClass: '' },
    { key: 'result', label: 'Result', extraClass: '' },
    { key: 'ending', label: 'Ending', extraClass: 'ending-card' },
  ];

  const renderedSections = SECTION_CONFIG.map(cfg => ({
    ...cfg,
    content: data.sections?.[cfg.key] || data[cfg.key] || ''
  })).filter(section => section.content);

  grid.innerHTML = renderedSections.map(section => `
    <div class="section-card ${section.extraClass}">
      <div class="sec-label">${section.label}</div>
      <div class="sec-content">${escapeHtml(section.content)}</div>
    </div>`
  ).join('');

  latestScriptText = buildScriptText(renderedSections);
  const testerInput = document.getElementById('scriptTesterInput');
  if (testerInput) testerInput.value = latestScriptText;

  grid.style.display = 'grid';
  document.getElementById('canvasEmpty').style.display = 'none';
  document.getElementById('copyFullBtn').style.display = 'inline-flex';

  if (data.wordCount || data.duration) {
    document.getElementById('metaWords').textContent = data.wordCount || '-';
    document.getElementById('metaDuration').textContent = data.duration || '-';

    const tagsEl = document.getElementById('metaHashtags');
    tagsEl.innerHTML = (data.hashtags || []).map(h => `<span class="hashtag">${escapeHtml(h)}</span>`).join('');
    document.getElementById('scriptMeta').style.display = 'flex';
  }

  window.latestGeneratedHooks = { hooks: data.hooks || [], bestHook: data.bestHook || '' };
  if (document.getElementById('hooksContent') && data.hooks?.length) {
    renderHooks(data.hooks, data.bestHook);
  }

  setScriptTesterStatus('Ready', 'done');
};

function buildScriptText(sections) {
  return sections.map(section => `[${section.label}]\n${section.content}`).join('\n\n').trim();
}

function renderHooks(hooks, bestHookText) {
  const el = document.getElementById('hooksContent');
  const countEl = document.getElementById('hookCount');
  if (!el || !countEl) return;

  if (!hooks || hooks.length === 0) {
    el.innerHTML = '<div class="hooks-empty-state hooks-empty-large"><div class="ei"><i class="fa-solid fa-bolt"></i></div>No hooks returned</div>';
    countEl.style.display = 'none';
    return;
  }

  countEl.textContent = hooks.length;
  countEl.style.display = 'inline-flex';

  el.innerHTML = `<div class="hooks-list">${hooks.map((h, i) => {
    const text = typeof h === 'string' ? h : (h.text || h.hook || JSON.stringify(h));
    const isBest = bestHookText ? (text === bestHookText) : (i === 0);
    const escaped = escapeJsString(text);
    const safeText = escapeHtml(text);

    return `
      <div class="hook-item ${isBest ? 'best' : ''}" style="animation-delay:${i * 0.06}s">
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

function getHookTestContext() {
  const hookContext = window.getHookStudioContext?.();
  return {
    topic: hookContext?.topic || document.getElementById('hookGeneratorInput')?.value.trim() || document.getElementById('mainInput')?.value.trim() || '',
    tone: hookContext?.tone || activeTone
  };
}

async function testHookText(hookText, triggerBtn) {
  const resultEl = document.getElementById('hookTesterResult');
  const manualInput = document.getElementById('hookTesterInput');
  const { topic, tone } = getHookTestContext();

  if (!hookText || !hookText.trim()) {
    manualInput?.focus();
    return;
  }

  if (manualInput) manualInput.value = hookText.trim();
  if (triggerBtn) triggerBtn.disabled = true;
  setHookTesterStatus('Analyzing', 'active');
  if (resultEl) {
    resultEl.innerHTML = '<div class="hook-test-loading"><div class="spinner"></div><span>Testing hook...</span></div>';
  }

  try {
    const res = await fetch('/api/test-hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hook: hookText.trim(), topic, tone })
    });

    if (!res.ok) {
      if (res.status === 401) return window.Auth.logout();
      throw new Error('Hook test failed');
    }

    const data = await res.json();
    renderHookTestResult(data);
    setHookTesterStatus('Scored', 'done');
  } catch (err) {
    console.error('Hook Test Error:', err);
    setHookTesterStatus('Error');
    if (resultEl) resultEl.innerHTML = '<div class="hook-test-error">Could not test this hook. Please try again.</div>';
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

function renderHookTestResult(data) {
  const resultEl = document.getElementById('hookTesterResult');
  if (!resultEl) return;

  const score = Number(data.score || 0);
  const metrics = data.metrics || {};
  const betterVersions = (data.better_versions || []).map(item => {
    const escaped = escapeJsString(item);
    return `
      <div class="hook-rewrite">
        <span>${escapeHtml(item)}</span>
        <button onclick="copyHook(this, \`${escaped}\`)"><i class="fa-regular fa-copy"></i></button>
      </div>`;
  }).join('');

  resultEl.innerHTML = `
    <div class="analysis-card">
      <div class="analysis-hero">
        ${buildScoreRingHtml(score)}
        <div>
          <div class="analysis-grade">${escapeHtml(data.grade || 'Needs Work')}</div>
          <div class="analysis-verdict">${escapeHtml(data.verdict || 'No verdict returned.')}</div>
        </div>
      </div>
      ${renderMetricBars([
        ['curiosity', 'Curiosity', metrics.curiosity],
        ['clarity', 'Clarity', metrics.clarity],
        ['specificity', 'Specificity', metrics.specificity],
        ['spoken', 'Spoken Feel', metrics.spoken]
      ])}
      ${renderAnalysisList('Works', data.strengths)}
      ${renderAnalysisList('Fix', data.weaknesses)}
      ${betterVersions ? `<div class="analysis-block"><div class="analysis-label">Better Versions</div>${betterVersions}</div>` : ''}
    </div>`;
}

function renderMetricBars(items) {
  const bars = items.map(([, label, value]) => {
    const score = Math.max(0, Math.min(100, Number(value || 0)));
    return `
      <div class="analysis-meter">
        <div class="analysis-meter-head"><span>${escapeHtml(label)}</span><span>${score}</span></div>
        <div class="analysis-meter-track"><div class="analysis-meter-fill" style="--value:${score}%"></div></div>
      </div>`;
  }).join('');

  return `<div class="analysis-metrics">${bars}</div>`;
}

function renderAnalysisList(label, items) {
  const cleanItems = (items || []).filter(Boolean);
  if (!cleanItems.length) return '';

  return `
    <div class="analysis-block">
      <div class="analysis-label">${escapeHtml(label)}</div>
      <ul class="analysis-list">${cleanItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>`;
}

function testManualHook() {
  const btn = document.getElementById('hookTesterBtn');
  const text = document.getElementById('hookTesterInput')?.value || '';
  testHookText(text, btn);
}

function testGeneratedHook(event, hookText) {
  event.stopPropagation();
  testHookText(hookText, event.currentTarget);
}

function copyHook(btn, text) {
  navigator.clipboard.writeText(text).catch(() => {});
  btn.innerHTML = '<i class="fa-solid fa-check"></i>';
  setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i>', 1500);
}

function setHookTesterStatus(text, state) {
  const status = document.getElementById('hookTesterStatus');
  if (!status) return;
  status.textContent = text;
  status.className = `analysis-pill ${state || ''}`.trim();
}

function setScriptTesterStatus(text, state) {
  const status = document.getElementById('scriptTesterStatus');
  if (!status) return;
  status.textContent = text;
  status.className = `analysis-pill ${state || ''}`.trim();
}

async function testCurrentScript() {
  const btn = document.getElementById('scriptTesterBtn');
  const resultEl = document.getElementById('scriptTesterResult');
  const inputEl = document.getElementById('scriptTesterInput');
  const script = (inputEl?.value || latestScriptText || '').trim();
  const topic = document.getElementById('mainInput')?.value.trim() || '';

  if (!script) {
    inputEl?.focus();
    return;
  }

  if (btn) btn.disabled = true;
  setScriptTesterStatus('Analyzing', 'active');
  if (resultEl) {
    resultEl.innerHTML = '<div class="hook-test-loading"><div class="spinner"></div><span>Testing script...</span></div>';
  }

  try {
    const res = await fetch('/api/test-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, topic, tone: activeTone })
    });

    if (!res.ok) {
      if (res.status === 401) return window.Auth.logout();
      throw new Error('Script test failed');
    }

    const data = await res.json();
    renderScriptTestResult(data);
    setScriptTesterStatus('Scored', 'done');
  } catch (err) {
    console.error('Script Test Error:', err);
    setScriptTesterStatus('Error');
    if (resultEl) resultEl.innerHTML = '<div class="hook-test-error">Could not test this script. Please try again.</div>';
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderScriptTestResult(data) {
  const resultEl = document.getElementById('scriptTesterResult');
  if (!resultEl) return;

  const score = Number(data.score || 0);
  const metrics = data.metrics || {};
  const meta = [
    data.word_count ? `${data.word_count} words` : '',
    data.estimated_duration || ''
  ].filter(Boolean);

  resultEl.innerHTML = `
    <div class="analysis-card">
      <div class="analysis-hero">
        ${buildScoreRingHtml(score)}
        <div>
          <div class="analysis-grade">${escapeHtml(data.grade || 'Needs Tightening')}</div>
          <div class="analysis-verdict">${escapeHtml(data.verdict || 'No verdict returned.')}</div>
          ${meta.length ? `<div class="analysis-meta-row">${meta.map(item => `<span class="analysis-meta-chip">${escapeHtml(item)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
      ${renderMetricBars([
        ['hook', 'Hook', metrics.hook],
        ['retention', 'Retention', metrics.retention],
        ['clarity', 'Clarity', metrics.clarity],
        ['structure', 'Structure', metrics.structure],
        ['payoff', 'Payoff', metrics.payoff]
      ])}
      ${renderAnalysisList('Works', data.strengths)}
      ${renderAnalysisList('Weak Spots', data.weaknesses)}
      ${renderAnalysisList('Fix Next', data.fixes)}
    </div>`;
}

function copyFullScript() {
  const full = latestScriptText || [...document.querySelectorAll('.section-card')].map(card => {
    const label = card.querySelector('.sec-label')?.textContent || '';
    const content = card.querySelector('.sec-content')?.textContent || '';
    return `[${label}]\n${content}`;
  }).join('\n\n').trim();

  navigator.clipboard.writeText(full).catch(() => {});

  const btn = document.getElementById('copyFullBtn');
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
  setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Script', 1800);
}

function initScriptStudio() {
  buildToneStrip();

  document.getElementById('mainInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerGenerate();
    }
  });
}

if (document.getElementById('script-view')) {
  initScriptStudio();
} else {
  document.addEventListener('aurora:partials-loaded', initScriptStudio, { once: true });
}
