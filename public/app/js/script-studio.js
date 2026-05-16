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

function buildToneStrip() {
  const strip = document.getElementById('toneStrip');
  if (!strip) return;

  strip.innerHTML = TONES.map(t =>
    `<button class="tone-chip ${t === activeTone ? 'active' : ''}" onclick="selectTone('${t}', this)">${t}</button>`
  ).join('');
}

function selectTone(tone, el) {
  activeTone = tone;
  document.querySelectorAll('.tone-chip').forEach(c => c.classList.remove('active'));
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
  document.getElementById('hooksContent').innerHTML =
    '<div class="hooks-empty-state"><div class="spinner" style="margin:0 auto 8px;"></div>Generating hooks...</div>';

  try {
    if (typeof analyze === 'function') await analyze();
  } catch (e) {
    console.error(e);
  }

  btn.disabled = false;
  icon.innerHTML = '&uarr;';
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

  grid.innerHTML = SECTION_CONFIG.map(cfg => {
    const content = data.sections?.[cfg.key] || data[cfg.key] || '';
    if (!content) return '';

    return `
      <div class="section-card ${cfg.extraClass}">
        <div class="sec-label">${cfg.label}</div>
        <div class="sec-content">${content}</div>
      </div>`;
  }).join('');

  grid.style.display = 'grid';
  document.getElementById('canvasEmpty').style.display = 'none';
  document.getElementById('copyFullBtn').style.display = 'inline-flex';

  if (data.wordCount || data.duration) {
    document.getElementById('metaWords').textContent = data.wordCount || '-';
    document.getElementById('metaDuration').textContent = data.duration || '-';

    const tagsEl = document.getElementById('metaHashtags');
    tagsEl.innerHTML = (data.hashtags || []).map(h => `<span class="hashtag">${h}</span>`).join('');
    document.getElementById('scriptMeta').style.display = 'flex';
  }

  renderHooks(data.hooks || data.alternateHooks || []);
};

function renderHooks(hooks) {
  const el = document.getElementById('hooksContent');
  const countEl = document.getElementById('hookCount');

  if (!hooks || hooks.length === 0) {
    el.innerHTML = '<div class="hooks-empty-state"><div class="ei">Hooks</div>No hooks returned</div>';
    countEl.style.display = 'none';
    return;
  }

  countEl.textContent = hooks.length;
  countEl.style.display = 'inline-flex';
  el.innerHTML = `<div class="hooks-list">${hooks.map((h, i) => {
    const text = typeof h === 'string' ? h : (h.text || h.hook || JSON.stringify(h));
    const escaped = text.replace(/`/g, '\\`');

    return `
      <div class="hook-item ${i === 0 ? 'best' : ''}" style="animation-delay:${i * 0.06}s">
        <div style="flex:1">
          ${i === 0 ? '<div class="hook-best-label">Best</div>' : ''}
          <div class="hook-text">${text}</div>
        </div>
        <button class="hook-copy-btn" onclick="copyHook(this, \`${escaped}\`)">
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>`;
  }).join('')}</div>`;
}

function copyHook(btn, text) {
  navigator.clipboard.writeText(text).catch(() => {});
  btn.innerHTML = '<i class="fa-solid fa-check"></i>';
  setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i>', 1500);
}

function copyFullScript() {
  const sections = document.querySelectorAll('.section-card .sec-content');
  const labels = document.querySelectorAll('.section-card .sec-label');
  let full = '';

  sections.forEach((section, i) => {
    full += `[${labels[i]?.textContent}]\n${section.textContent}\n\n`;
  });

  navigator.clipboard.writeText(full.trim()).catch(() => {});

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
