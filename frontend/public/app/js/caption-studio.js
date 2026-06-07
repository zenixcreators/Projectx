const LANGUAGES = [
  { code: 'te', name: 'Telugu', top: true },
  { code: 'en', name: 'English', top: true },
  { code: 'hi', name: 'Hindi', top: true },
  { code: 'es', name: 'Spanish', top: true },
  { code: 'fr', name: 'French', top: true },
  { code: 'ar', name: 'Arabic', top: true },
  { code: 'pt', name: 'Portuguese', top: true },
  { code: 'de', name: 'German', top: true },
  { code: 'zh', name: 'Chinese', top: false },
  { code: 'ja', name: 'Japanese', top: false },
  { code: 'ko', name: 'Korean', top: false },
  { code: 'it', name: 'Italian', top: false },
  { code: 'ru', name: 'Russian', top: false },
  { code: 'tr', name: 'Turkish', top: false },
  { code: 'nl', name: 'Dutch', top: false },
];

let selectedLangs = new Set([]);
let langDropdownOpen = false;

/* ---- Language Pills ---- */
function renderLangPills() {
  const wrap = document.getElementById('langPillsWrap');
  if (!wrap) return;
  wrap.innerHTML = [...selectedLangs].map(code => {
    const l = LANGUAGES.find(x => x.code === code) || { name: code };
    return `
      <div class="lang-pill">
        <span>${l.name}</span>
        <button class="lang-pill-remove" onclick="toggleLangOpt('${code}')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>`;
  }).join('');
}

function removeLang(code) {
  selectedLangs.delete(code);
  renderLangPills();
  renderLangDropdownGrid();
}

function toggleLangDropdown() {
  const dd = document.getElementById('langDropdown');
  if (!dd) return;
  langDropdownOpen = !langDropdownOpen;
  dd.style.display = langDropdownOpen ? 'block' : 'none';
  if (langDropdownOpen) renderLangDropdownGrid();
}

function renderLangDropdownGrid() {
  const grid = document.getElementById('langDropdownGrid');
  if (!grid) return;
  grid.innerHTML = LANGUAGES.map(l =>
    `<button class="lang-opt ${selectedLangs.has(l.code) ? 'selected' : ''}" onclick="toggleLangOpt('${l.code}')">${l.name}</button>`
  ).join('');
}

function toggleLangOpt(code) {
  selectedLangs.has(code) ? selectedLangs.delete(code) : selectedLangs.add(code);
  renderLangPills();
  renderLangDropdownGrid();
}

/* Close dropdown on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('.lang-selector-studio-v2')) {
    const dd = document.getElementById('langDropdown');
    if (dd) dd.style.display = 'none';
    langDropdownOpen = false;
  }
});

/* ---- Tab Switching ---- */
function switchCapTab(name, btnEl) {
  document.querySelectorAll('#caption-view .comp-tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('#caption-view .mode-btn').forEach(t => t.classList.remove('active'));
  const panel = document.getElementById('tab-' + name);
  if (panel) panel.style.display = 'block';
  if (btnEl) btnEl.classList.add('active');
}

/* ---- Format Toggle ---- */
function toggleFormatNew(el) {
  el.classList.toggle('active');
}

/* ---- Char Count ---- */
function updateCharCount() {
  const ta = document.getElementById('transcriptInput');
  const cc = document.getElementById('charCount');
  if (ta && cc) cc.textContent = ta.value.length + ' / 5000';
}

/* ---- File Handling ---- */
function handleFile(input, type) {
  const file = input.files[0];
  if (!file) return;
  const el = document.getElementById(type + 'FileName');
  if (el) el.textContent = file.name;
}

function getActiveInput() {
  const activePanel = Array.from(document.querySelectorAll('#caption-view .comp-tab-panel'))
    .find(p => p.style.display !== 'none' && window.getComputedStyle(p).display !== 'none');
  if (!activePanel) return null;

  if (activePanel.id === 'tab-transcript') {
    return { type: 'transcript', value: document.getElementById('transcriptInput')?.value.trim() };
  }
  if (activePanel.id === 'tab-url') {
    return { type: 'url', value: document.getElementById('urlInput')?.value.trim() };
  }
  if (activePanel.id === 'tab-video') {
    return { type: 'video', file: document.getElementById('videoFile')?.files[0] };
  }
  if (activePanel.id === 'tab-audio') {
    return { type: 'audio', file: document.getElementById('audioFile')?.files[0] };
  }
  return null;
}

/* ---- Generate ---- */
async function generateCaptions() {
  const input = getActiveInput();
  if (!input) return;

  const langs = [...selectedLangs];
  const formats = [...document.querySelectorAll('.fmt-pill.active')].map(el => el.dataset.fmt);

  if (!langs.length) return window.showToast('Language Selection Required', 'Please select at least one language.', 'warning');
  if (!formats.length) return window.showToast('Format Selection Required', 'Please select at least one file format.', 'warning');
  if (input.type === 'transcript' && !input.value) return window.showToast('Transcript Missing', 'Please paste the transcript content.', 'warning');
  if (input.type === 'url' && !input.value) return window.showToast('URL Required', 'Please enter a valid YouTube video URL.', 'warning');
  if ((input.type === 'video' || input.type === 'audio') && !input.file) return window.showToast('File Required', 'Please select an audio or video file.', 'warning');

  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>Generating…</span>';

  // Hide empty state, show results container
  const canvasEmpty = document.getElementById('canvasEmpty');
  const results = document.getElementById('results');
  if (canvasEmpty) canvasEmpty.style.display = 'none';

  try {
    let body;
    const headers = {};

    if (input.type === 'video' || input.type === 'audio') {
      const fd = new FormData();
      fd.append('file', input.file);
      fd.append('type', input.type);
      fd.append('langs', JSON.stringify(langs));
      fd.append('formats', JSON.stringify(formats));
      body = fd;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        type: input.type,
        value: input.value,
        langs: JSON.stringify(langs),
        formats: JSON.stringify(formats)
      });
    }

    const res = await fetch('/caption', { method: 'POST', headers, body });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    renderCaptionResults(data, langs, formats);
  } catch (err) {
    window.showToast('Caption Processing Failed', err.message, 'error');
    if (canvasEmpty) canvasEmpty.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Generate Captions</span><i class="fa-solid fa-wand-magic-sparkles"></i>';
  }
}

/* ---- Helper: Extract YouTube ID ---- */
function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[2] : null;
}

/* ---- Render Results ---- */
function renderCaptionResults(data, langs, formats) {
  const tabsEl = document.getElementById('captionTabs');
  const outputsEl = document.getElementById('captionOutputs');
  const previewEl = document.getElementById('videoPreview');
  const langMap = Object.fromEntries(LANGUAGES.map(l => [l.code, l]));
  const input = getActiveInput();

  // Handle Preview
  if (input.type === 'url' && input.value) {
    const vidId = getYouTubeId(input.value);
    if (vidId) {
      previewEl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${vidId}" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    }
  } else if (input.type === 'video' && input.file) {
    const url = URL.createObjectURL(input.file);
    previewEl.innerHTML = `<video src="${url}" controls style="width:100%; height:100%;"></video>`;
  } else {
    previewEl.innerHTML = `
      <div class="preview-placeholder">
        <i class="fa-solid fa-file-audio"></i>
        <span>Audio Waveform Preview</span>
      </div>`;
  }

  // Render Tabs
  const defLang = langs.includes('en') ? 'en' : langs[0];

  tabsEl.innerHTML = langs.map((code) => {
    const lang = langMap[code] || { name: code };
    return `<button class="caption-tab ${code === defLang ? 'active' : ''}" onclick="switchCaptionTab('${code}', this)">${lang.name}</button>`;
  }).join('');

  // Render Outputs
  outputsEl.innerHTML = langs.map((code) => {
    const lang = langMap[code] || { name: code };
    const captions = data.captions?.[code] || {};
    const defFmt = formats[0] || 'txt';
    const content = captions[defFmt] || 'No content generated.';

    // Render switcher pills
    const switcherHtml = `
      <div class="format-switcher-bar">
        <div class="format-switcher-title">Format</div>
        <div class="format-switcher-pills">
          ${formats.map(fmt => `
            <button class="fmt-switcher-pill ${fmt === defFmt ? 'active' : ''}" 
                    onclick="changeOutputFormat('${code}', '${fmt}', this)">
              ${fmt.toUpperCase()}
            </button>
          `).join('')}
        </div>
      </div>`;

    // Try to segment if it's SRT/VTT
    let finalHtml = '';
    if (defFmt === 'srt' || defFmt === 'vtt') {
      const segments = parseCaptionsToSegments(content);
      finalHtml = `
        <div class="transcript-list">
          ${segments.map(s => `
            <div class="caption-segment" onclick="seekVideo('${s.start}')">
              <span class="segment-time">${s.time}</span>
              <span class="segment-text">${s.text}</span>
            </div>
          `).join('')}
        </div>`;
    } else {
      finalHtml = `
        <div class="raw-caption-view">
          <textarea readonly class="raw-caption-textarea" id="caption-text-${code}">${content}</textarea>
        </div>`;
    }

    return `
      <div class="caption-output ${code === defLang ? 'active' : ''}" id="output-${code}">
        ${switcherHtml}
        <div class="format-content-container" id="content-${code}">
          ${finalHtml}
        </div>
      </div>`;
  }).join('');

  document.getElementById('resultsCount').textContent =
    langs.length + ' language' + (langs.length > 1 ? 's' : '') + ' · ' + formats.join(', ').toUpperCase();

  const results = document.getElementById('results');
  results.style.display = 'flex';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  window._captionData = data;
  window._captionFormats = formats;
  window._captionActiveLang = defLang;
  window._captionActiveFormat = formats[0] || 'txt';
}

/* ---- Parse SRT/VTT ---- */
function parseCaptionsToSegments(text) {
  // Simple SRT parser
  const lines = text.trim().split(/\r?\n/);
  const segments = [];
  let current = {};

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (/^\d+$/.test(line)) {
      if (current.text) segments.push(current);
      current = {};
    } else if (line.includes(' --> ')) {
      current.time = line.split(' --> ')[0].split(',')[0]; // Simple HH:MM:SS
      current.start = timeToSeconds(current.time);
    } else {
      current.text = current.text ? current.text + ' ' + line : line;
    }
  }
  if (current.text) segments.push(current);
  return segments;
}

function timeToSeconds(time) {
  const parts = time.split(':').map(parseFloat);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function seekVideo(seconds) {
  const iframe = document.querySelector('#videoPreview iframe');
  if (iframe && (iframe.src.includes('youtube.com') || iframe.src.includes('youtube-nocookie.com'))) {
    const baseUrl = iframe.src.split('?')[0];
    iframe.src = `${baseUrl}?start=${Math.floor(seconds)}&autoplay=1`;
  }
  const video = document.querySelector('#videoPreview video');
  if (video) {
    video.currentTime = seconds;
    video.play();
  }
}

/* ---- Tab Switch ---- */
function switchCaptionTab(code, btn) {
  document.querySelectorAll('.caption-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.caption-output').forEach(o => o.classList.remove('active'));
  btn.classList.add('active');
  const targetOutput = document.getElementById('output-' + code);
  if (targetOutput) {
    targetOutput.classList.add('active');
    // Read the currently active format pill inside this output container
    const activeFmtBtn = targetOutput.querySelector('.fmt-switcher-pill.active');
    if (activeFmtBtn) {
      window._captionActiveFormat = activeFmtBtn.textContent.trim().toLowerCase();
    }
  }
  window._captionActiveLang = code;
}

/* ---- Format Switch ---- */
function changeOutputFormat(code, fmt, btn) {
  btn.closest('.format-switcher-pills').querySelectorAll('.fmt-switcher-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const container = document.getElementById(`content-${code}`);
  if (!container) return;

  const content = window._captionData?.captions?.[code]?.[fmt] || '';

  if (fmt === 'srt' || fmt === 'vtt') {
    const segments = parseCaptionsToSegments(content);
    container.innerHTML = `
      <div class="transcript-list">
        ${segments.map(s => `
          <div class="caption-segment" onclick="seekVideo('${s.start}')">
            <span class="segment-time">${s.time}</span>
            <span class="segment-text">${s.text}</span>
          </div>
        `).join('')}
      </div>`;
  } else {
    container.innerHTML = `
      <div class="raw-caption-view">
        <textarea readonly class="raw-caption-textarea" id="caption-text-${code}">${content}</textarea>
      </div>`;
  }

  window._captionActiveFormat = fmt;
}

/* ---- Copy & Download ---- */
function copyActiveCaption() {
  const code = window._captionActiveLang;
  const fmt = window._captionActiveFormat || 'txt';
  const content = window._captionData?.captions?.[code]?.[fmt] || '';

  if (!content) return;

  navigator.clipboard.writeText(content).then(() => {
    const copyBtn = document.querySelector('.canvas-action-btn.primary');
    if (copyBtn) {
      const origHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => copyBtn.innerHTML = origHtml, 2000);
    }
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}

function downloadActiveCaption() {
  const code = window._captionActiveLang;
  const fmt = window._captionActiveFormat || 'txt';
  const content = window._captionData?.captions?.[code]?.[fmt] || '';

  if (!content) return;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.download = `captions_${code}.${fmt}`;
  a.click();
}


/* ---- Init ---- */
function initCaptionStudio() {
  renderLangPills();
  updateCharCount();

  const ta = document.getElementById('transcriptInput');
  if (ta) ta.addEventListener('input', updateCharCount);

  ['videoDropzone', 'audioDropzone'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const fileInput = el.querySelector('input[type="file"]');
      if (e.dataTransfer.files.length && fileInput) {
        fileInput.files = e.dataTransfer.files;
        handleFile(fileInput, id.replace('Dropzone', ''));
      }
    });
  });
}

if (document.getElementById('caption-view')) {
  initCaptionStudio();
} else {
  document.addEventListener('creo:partials-loaded', initCaptionStudio, { once: true });
}