function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function buildScoreRingHtml(score) {
  const numScore = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (numScore / 100) * circumference;
  
  let color = 'var(--accent)';
  if (numScore >= 85) { color = 'var(--green)'; }
  else if (numScore >= 70) { color = 'var(--accent)'; }
  else if (numScore >= 55) { color = 'var(--amber)'; }
  else { color = 'var(--red)'; }

  return `
    <div class="analysis-score-ring-wrapper" style="--score-color: ${color}">
      <svg class="score-ring-svg" viewBox="0 0 60 60">
        <circle class="score-ring-bg" cx="30" cy="30" r="25"></circle>
        <circle class="score-ring-progress" cx="30" cy="30" r="25" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <div class="score-ring-text">
        <span class="score-number">${numScore}</span>
        <span class="score-label">Score</span>
      </div>
    </div>
  `;
}

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
let studioMode = 'long';
let optionsOpen = false;

// Global settings state to preserve between toggles
const settingsState = {
  long: {
    audience: '',
    duration: '5–10 min',
    sections: 5,
    hookStyle: 'Question',
    ctaStyle: 'Subscribe CTA',
    context: ''
  },
  short: {
    audience: '',
    platform: 'TikTok',
    length: '60 seconds',
    hookStyle: 'Bold Claim',
    pacingStyle: 'Fast Cut',
    ctaStyle: 'Follow for more',
    context: ''
  }
};

function saveOptionsState() {
  const audienceEl = document.getElementById('optAudience');
  const contextEl = document.getElementById('optContext');
  const hookStyleEl = document.getElementById('optHookStyle');
  const ctaStyleEl = document.getElementById('optCtaStyle');

  if (studioMode === 'long') {
    if (audienceEl) settingsState.long.audience = audienceEl.value;
    if (contextEl) settingsState.long.context = contextEl.value;
    if (hookStyleEl) settingsState.long.hookStyle = hookStyleEl.value;
    if (ctaStyleEl) settingsState.long.ctaStyle = ctaStyleEl.value;

    const durationEl = document.getElementById('optDuration');
    const sectionsEl = document.getElementById('optSections');
    if (durationEl) settingsState.long.duration = durationEl.value;
    if (sectionsEl) settingsState.long.sections = Number(sectionsEl.value) || 5;
  } else {
    if (audienceEl) settingsState.short.audience = audienceEl.value;
    if (contextEl) settingsState.short.context = contextEl.value;
    if (hookStyleEl) settingsState.short.hookStyle = hookStyleEl.value;
    if (ctaStyleEl) settingsState.short.ctaStyle = ctaStyleEl.value;

    const platformEl = document.getElementById('optPlatform');
    const lengthEl = document.getElementById('optLength');
    const pacingEl = document.getElementById('optPacingStyle');
    if (platformEl) settingsState.short.platform = platformEl.value;
    if (lengthEl) settingsState.short.length = lengthEl.value;
    if (pacingEl) settingsState.short.pacingStyle = pacingEl.value;
  }
}

function renderModeOptions() {
  const drawer = document.getElementById('optionsDrawer');
  if (!drawer) return;

  if (studioMode === 'long') {
    drawer.innerHTML = `
      <div class="option-field">
        <label class="option-label">Target Audience</label>
        <input type="text" id="optAudience" class="option-input" placeholder="e.g. beginner developers">
      </div>
      <div class="option-field">
        <label class="option-label">Target Duration</label>
        <select id="optDuration" class="option-select">
          <option>5–10 min</option>
          <option>10–20 min</option>
          <option>20–40 min</option>
          <option>40–60 min</option>
        </select>
      </div>
      <div class="option-field">
        <label class="option-label">Number of Sections</label>
        <input type="number" id="optSections" class="option-input" min="3" max="10" value="5">
      </div>
      <div class="option-field">
        <label class="option-label">Hook Style</label>
        <select id="optHookStyle" class="option-select">
          <option>Question</option>
          <option>Bold Statement</option>
          <option>Shocking Fact</option>
          <option>Story Open</option>
          <option>Contrast Hook</option>
        </select>
      </div>
      <div class="option-field">
        <label class="option-label">CTA Style</label>
        <select id="optCtaStyle" class="option-select">
          <option>Subscribe CTA</option>
          <option>Link in Bio</option>
          <option>Product Plug</option>
          <option>Community CTA</option>
          <option>Soft Close</option>
        </select>
      </div>
      <div class="option-field full-width">
        <label class="option-label">Additional Context</label>
        <textarea id="optContext" class="option-textarea" rows="2" placeholder="Secondary reference details, keywords, must-include facts..."></textarea>
      </div>
    `;

    document.getElementById('optAudience').value = settingsState.long.audience;
    document.getElementById('optDuration').value = settingsState.long.duration;
    document.getElementById('optSections').value = settingsState.long.sections;
    document.getElementById('optHookStyle').value = settingsState.long.hookStyle;
    document.getElementById('optCtaStyle').value = settingsState.long.ctaStyle;
    document.getElementById('optContext').value = settingsState.long.context;

  } else {
    drawer.innerHTML = `
      <div class="option-field">
        <label class="option-label">Target Audience</label>
        <input type="text" id="optAudience" class="option-input" placeholder="e.g. general viewers">
      </div>
      <div class="option-field">
        <label class="option-label">Platform</label>
        <select id="optPlatform" class="option-select">
          <option>TikTok</option>
          <option>Instagram Reels</option>
          <option>YouTube Shorts</option>
        </select>
      </div>
      <div class="option-field">
        <label class="option-label">Target Length</label>
        <select id="optLength" class="option-select">
          <option>60 seconds</option>
          <option>90 seconds</option>
          <option>2 minutes</option>
          <option>3 minutes</option>
        </select>
      </div>
      <div class="option-field">
        <label class="option-label">Hook Style</label>
        <select id="optHookStyle" class="option-select">
          <option>Bold Claim</option>
          <option>Shocking Stat</option>
          <option>Relatable Problem</option>
          <option>Direct Question</option>
          <option>Curiosity Gap</option>
        </select>
      </div>
      <div class="option-field">
        <label class="option-label">Pacing Style</label>
        <select id="optPacingStyle" class="option-select">
          <option>Fast Cut</option>
          <option>Smooth Flow</option>
          <option>Narrative Arc</option>
        </select>
      </div>
      <div class="option-field">
        <label class="option-label">CTA Style</label>
        <select id="optCtaStyle" class="option-select">
          <option>Follow for more</option>
          <option>Link in bio</option>
          <option>Comment below</option>
          <option>Share this</option>
          <option>Save this</option>
        </select>
      </div>
      <div class="option-field full-width">
        <label class="option-label">Additional Context</label>
        <textarea id="optContext" class="option-textarea" rows="2" placeholder="Secondary reference details, keywords, must-include facts..."></textarea>
      </div>
    `;

    document.getElementById('optAudience').value = settingsState.short.audience;
    document.getElementById('optPlatform').value = settingsState.short.platform;
    document.getElementById('optLength').value = settingsState.short.length;
    document.getElementById('optHookStyle').value = settingsState.short.hookStyle;
    document.getElementById('optPacingStyle').value = settingsState.short.pacingStyle;
    document.getElementById('optCtaStyle').value = settingsState.short.ctaStyle;
    document.getElementById('optContext').value = settingsState.short.context;
  }
}

window.setStudioMode = function(mode) {
  if (studioMode === mode) return;
  saveOptionsState();
  studioMode = mode;

  const btnLong = document.getElementById('modeBtnLong');
  const btnShort = document.getElementById('modeBtnShort');
  if (btnLong && btnShort) {
    if (mode === 'long') {
      btnLong.classList.add('active');
      btnShort.classList.remove('active');
    } else {
      btnShort.classList.add('active');
      btnLong.classList.remove('active');
    }
  }

  renderModeOptions();
};

window.toggleOptionsDrawer = function() {
  const drawer = document.getElementById('optionsDrawer');
  const btn = document.getElementById('optionsToggleBtn');
  if (!drawer || !btn) return;

  optionsOpen = !optionsOpen;
  if (optionsOpen) {
    drawer.classList.add('open');
    btn.classList.add('active');
  } else {
    drawer.classList.remove('open');
    btn.classList.remove('active');
  }
};

function getWordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function getEstimatedDurationText(words) {
  const seconds = Math.round(words / 2.35); // Approx 140 WPM pacing
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins} min ${secs} sec` : `${mins} min`;
}

function parseLongForm(text) {
  const regex = /\[(?:\d{2}:\d{2})\]\s*\[(?:HOOK|INTRO|SECTION|OUTRO|OUTRO \/ CTA)[^\]]*\]|\[(?:HOOK|INTRO|SECTION|OUTRO|OUTRO \/ CTA)[^\]]*\]/gi;
  const sections = [];
  const matches = [];
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      text: match[0]
    });
  }
  
  if (matches.length === 0) {
    return {
      firstNonSectionText: "",
      sections: [{
        header: "Script Content",
        timestamp: null,
        body: text
      }]
    };
  }
  
  const firstNonSectionText = text.substring(0, matches[0].index).trim();
  
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current.text.length;
    const end = next ? next.index : text.length;
    const body = text.substring(start, end).trim();
    
    const tsMatch = current.text.match(/\[(\d{2}:\d{2})\]/);
    const timestamp = tsMatch ? tsMatch[1] : null;
    
    let cleanHeader = current.text.replace(/\[\d{2}:\d{2}\]/, "").replace(/[\[\]]/g, "").trim();
    
    sections.push({
      header: cleanHeader,
      timestamp,
      body
    });
  }
  
  return { firstNonSectionText, sections };
}

function parseShortForm(text) {
  const regex = /\[(?:HOOK|BODY|CTA)\]/gi;
  const sections = {
    hook: "",
    body: "",
    cta: ""
  };
  
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0].toUpperCase();
    let label = "hook";
    if (matchedText.includes("BODY")) label = "body";
    if (matchedText.includes("CTA")) label = "cta";
    
    matches.push({
      index: match.index,
      label,
      text: match[0]
    });
  }
  
  if (matches.length === 0) {
    return {
      hook: "",
      body: text,
      cta: ""
    };
  }
  
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current.text.length;
    const end = next ? next.index : text.length;
    const body = text.substring(start, end).trim();
    
    sections[current.label] = body;
  }
  
  return sections;
}

function renderLongFormText(text) {
  const bRollRegex = /\[B-ROLL:\s*([^\]]+)\]/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = bRollRegex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: "text", content: textBefore });
    }
    parts.push({ type: "b-roll", content: match[1] });
    lastIndex = bRollRegex.lastIndex;
  }
  
  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push({ type: "text", content: remainingText });
  }
  
  if (parts.length === 0) {
    return `<div class="sec-content-raw">${escapeHtml(text)}</div>`;
  }
  
  return parts.map((part) => {
    if (part.type === "b-roll") {
      return `
        <div class="b-roll-pill">
          <span class="b-roll-icon">🎬</span>
          <div class="b-roll-text-wrapper">
            <span class="b-roll-label">Visual Cue / B-Roll</span>
            <span class="b-roll-text">${escapeHtml(part.content)}</span>
          </div>
        </div>
      `;
    } else {
      return part.content.split('\n').map(para => {
        const trimmed = para.trim();
        if (!trimmed) return '';
        return `<p class="sec-para">${escapeHtml(trimmed)}</p>`;
      }).join('');
    }
  }).join('');
}

function renderShortFormText(text) {
  const textRegex = /\[TEXT:\s*["']?([^\]"']+)["']?\]/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = textRegex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: "text", content: textBefore });
    }
    parts.push({ type: "text-overlay", content: match[1] });
    lastIndex = textRegex.lastIndex;
  }
  
  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push({ type: "text", content: remainingText });
  }
  
  if (parts.length === 0) {
    return `<div class="sec-content-raw">${escapeHtml(text)}</div>`;
  }
  
  return parts.map((part) => {
    if (part.type === "text-overlay") {
      return `
        <span class="text-overlay-badge" title="On-Screen Text Suggestion">
          💬 "${escapeHtml(part.content)}"
        </span>
      `;
    } else {
      return escapeHtml(part.content).replace(/\n/g, '<br>');
    }
  }).join('');
}

window.toggleAccordion = function(headerEl) {
  const item = headerEl.closest('.accordion-item');
  if (!item) return;
  item.classList.toggle('active');
};

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

  document.getElementById('canvasEmpty').style.display = 'none';
  const grid = document.getElementById('sectionsGrid');
  if (grid) grid.style.display = 'none';
  
  const scriptMeta = document.getElementById('scriptMeta');
  if (scriptMeta) scriptMeta.style.display = 'none';

  const copyFullBtn = document.getElementById('copyFullBtn');
  if (copyFullBtn) copyFullBtn.style.display = 'none';

  setScriptTesterStatus('Idle');
  const scriptTesterResult = document.getElementById('scriptTesterResult');
  if (scriptTesterResult) {
    scriptTesterResult.innerHTML = `
      <div class="analysis-empty-state">
        <div class="analysis-mini-score">--</div>
        <span>Waiting for script</span>
      </div>`;
  }

  saveOptionsState();

  const payload = studioMode === 'long' 
    ? {
        type: 'long',
        topic: topic,
        audience: settingsState.long.audience.trim() || 'general creators',
        tone: activeTone,
        hookStyle: settingsState.long.hookStyle,
        ctaStyle: settingsState.long.ctaStyle,
        additionalContext: settingsState.long.context.trim(),
        targetDuration: settingsState.long.duration,
        sectionCount: Number(settingsState.long.sections) || 5
      }
    : {
        type: 'short',
        topic: topic,
        audience: settingsState.short.audience.trim() || 'general viewers',
        tone: activeTone,
        platform: settingsState.short.platform,
        targetLength: settingsState.short.length,
        hookStyle: settingsState.short.hookStyle,
        pacingStyle: settingsState.short.pacingStyle,
        ctaStyle: settingsState.short.ctaStyle,
        additionalContext: settingsState.short.context.trim()
      };

  try {
    const res = await fetch('/api/script/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 401) {
        if (window.Auth?.logout) return window.Auth.logout();
      }
      throw new Error('Script generation failed');
    }

    const data = await res.json();
    if (data.success) {
      renderScriptResult(data);
    } else {
      throw new Error(data.error || 'Could not generate script.');
    }
  } catch (e) {
    console.error(e);
    if (scriptTesterResult) {
      scriptTesterResult.innerHTML = `<div class="hook-test-error">Could not generate this script: ${escapeHtml(e.message)}</div>`;
    }
  } finally {
    btn.disabled = false;
    icon.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  }
}

window.renderScriptResult = function (data) {
  const grid = document.getElementById('sectionsGrid');
  if (!grid) return;

  let isNewFlow = !!data.script;
  let type = data.metadata?.type || data.type || studioMode;
  let text = data.script || '';

  if (!isNewFlow) {
    // Legacy flow fallback from /analyze
    type = 'long';
    const SECTION_CONFIG = [
      { key: 'hook', label: 'HOOK' },
      { key: 'problem', label: 'INTRO / PROBLEM' },
      { key: 'shift', label: 'SECTION 1' },
      { key: 'value', label: 'SECTION 2' },
      { key: 'result', label: 'SECTION 3' },
      { key: 'ending', label: 'OUTRO / ENDING' },
    ];
    const rawSections = data.sections || data;
    text = SECTION_CONFIG.map(cfg => {
      const content = rawSections[cfg.key] || '';
      return content ? `[${cfg.label}]\n${content}` : '';
    }).filter(Boolean).join('\n\n');
  }

  if (type === 'long') {
    const parsed = parseLongForm(text);
    grid.innerHTML = `
      <div class="script-accordion">
        ${parsed.sections.map((sec, idx) => `
          <div class="accordion-item ${idx < 3 ? 'active' : ''}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
              <div class="accordion-header-left">
                <div class="accordion-num">${idx + 1}</div>
                <h4 class="accordion-title">${escapeHtml(sec.header)}</h4>
                ${sec.timestamp ? `<span class="accordion-timestamp">${escapeHtml(sec.timestamp)}</span>` : ''}
              </div>
              <i class="fa-solid fa-chevron-down accordion-arrow"></i>
            </div>
            <div class="accordion-body">
              <div class="sec-content">${renderLongFormText(sec.body)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    const parsed = parseShortForm(text);
    grid.innerHTML = `
      <div class="script-zones">
        <div class="zone-card">
          <div class="zone-header">
            <span class="zone-title">Scroll-Stopping Hook</span>
            <span class="zone-badge hook">Hook</span>
          </div>
          <div class="zone-content">${renderShortFormText(parsed.hook || 'No hook generated.')}</div>
        </div>
        <div class="zone-card">
          <div class="zone-header">
            <span class="zone-title">Core Body Value</span>
            <span class="zone-badge body">Body</span>
          </div>
          <div class="zone-content">${renderShortFormText(parsed.body || 'No body content generated.')}</div>
        </div>
        <div class="zone-card">
          <div class="zone-header">
            <span class="zone-title">Conversion Outro</span>
            <span class="zone-badge cta">CTA</span>
          </div>
          <div class="zone-content">${renderShortFormText(parsed.cta || 'No CTA generated.')}</div>
        </div>
      </div>
    `;
  }

  latestScriptText = text;
  const testerInput = document.getElementById('scriptTesterInput');
  if (testerInput) testerInput.value = latestScriptText;

  grid.style.display = 'grid';
  document.getElementById('canvasEmpty').style.display = 'none';
  document.getElementById('copyFullBtn').style.display = 'inline-flex';

  const wordCountVal = data.metadata?.wordCount || data.wordCount || getWordCount(text);
  const durationVal = data.metadata?.estimatedDuration || data.duration || getEstimatedDurationText(wordCountVal);

  document.getElementById('metaWords').textContent = wordCountVal;
  document.getElementById('metaDuration').textContent = durationVal;

  const tagsEl = document.getElementById('metaHashtags');
  if (tagsEl) {
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
  if (typeof renderModeOptions === 'function') {
    renderModeOptions();
  }

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

// Expose handlers globally for dynamic HTML event bindings
window.triggerGenerate = triggerGenerate;
window.copyFullScript = copyFullScript;
window.testCurrentScript = testCurrentScript;
window.testManualHook = testManualHook;
window.testGeneratedHook = testGeneratedHook;
window.copyHook = copyHook;
window.selectTone = selectTone;
