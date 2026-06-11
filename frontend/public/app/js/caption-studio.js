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
  hideCaptionError();
  const input = getActiveInput();
  if (!input) return;

  const langs = [...selectedLangs];
  const formats = [...document.querySelectorAll('.fmt-pill.active')].map(el => el.dataset.fmt);

  if (!langs.length) { showCaptionError('Please select at least one language.'); return; }
  if (!formats.length) { showCaptionError('Please select at least one file format.'); return; }
  if (input.type === 'transcript' && !input.value) { showCaptionError('Please paste the transcript content.'); return; }
  if (input.type === 'url' && !input.value) { showCaptionError('Please enter a valid YouTube video URL.'); return; }
  if ((input.type === 'video' || input.type === 'audio') && !input.file) { showCaptionError('Please select an audio or video file.'); return; }

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
    const spokenLang = document.getElementById("captionLanguage")?.value || "auto";

    if (input.type === 'video' || input.type === 'audio') {
      const fd = new FormData();
      fd.append('file', input.file);
      fd.append('type', input.type);
      fd.append('langs', JSON.stringify(langs));
      fd.append('formats', JSON.stringify(formats));
      fd.append('language', spokenLang);
      body = fd;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        type: input.type,
        value: input.value,
        langs: JSON.stringify(langs),
        formats: JSON.stringify(formats),
        language: spokenLang
      });
    }

    const res = await fetch('/caption', { method: 'POST', headers, body });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    renderCaptionResults(data, langs, formats);
  } catch (err) {
    showCaptionError(err.message);
    const isUrlError = input.type === 'url';
    if (canvasEmpty) {
      canvasEmpty.style.display = 'flex';
      canvasEmpty.innerHTML = `
        <div class="empty-icon-wrap" style="background:rgba(220,38,38,0.08);border-color:rgba(220,38,38,0.15);">
          <i class="fa-solid fa-triangle-exclamation" style="color:#dc2626;"></i>
        </div>
        <h3 style="color:#dc2626;">Caption Generation Failed</h3>
        <p style="max-width:360px;text-align:center;font-size:13px;line-height:1.6;">${err.message}</p>
        ${isUrlError ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:12px;">
          <button onclick="switchToTextTab()" style="padding:9px 20px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-family:var(--font);font-weight:500;display:flex;align-items:center;gap:7px;">
            <i class="fa-solid fa-paragraph"></i> Switch to Text Tab
          </button>
          <span style="font-size:11px;color:var(--muted);">Or try a different public YouTube video</span>
        </div>` : `
        <div style="margin-top:12px;">
          <button onclick="resetCaptionCanvas()" style="padding:8px 18px;background:var(--hover);color:var(--text);border:1px solid var(--border);border-radius:10px;font-size:13px;cursor:pointer;font-family:var(--font);">
            <i class="fa-solid fa-rotate-left"></i> Try Again
          </button>
        </div>`}
      `;
    }
    window.showToast('Caption Failed', err.message.length > 80 ? err.message.substring(0, 80) + '...' : err.message, 'error');
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

  const burnActions = document.getElementById('burnActionsPanel');
  if (burnActions) {
    burnActions.style.display = 'block';
  }
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

/* ---- Error Recovery Helpers ---- */
function switchToTextTab() {
  const textBtn = document.querySelector('#caption-view .mode-btn');
  if (textBtn) {
    switchCapTab('transcript', textBtn);
    textBtn.classList.add('active');
    document.querySelectorAll('#caption-view .mode-btn').forEach(b => { if (b !== textBtn) b.classList.remove('active'); });
  }
  resetCaptionCanvas();
}

function resetCaptionCanvas() {
  const canvasEmpty = document.getElementById('canvasEmpty');
  if (canvasEmpty) {
    canvasEmpty.style.display = 'flex';
    canvasEmpty.innerHTML = `
      <div class="empty-icon-wrap">
        <i class="fa-solid fa-quote-left"></i>
      </div>
      <h3>Ready to Transcribe?</h3>
      <p>Your AI-generated captions will appear here with a full preview.</p>
      <div class="empty-steps">
        <span><i class="fa-solid fa-check"></i> Select Source</span>
        <span><i class="fa-solid fa-check"></i> Choose Languages</span>
        <span><i class="fa-solid fa-check"></i> Hit Generate</span>
      </div>
    `;
  }
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

/* ---- Style Template Selection ---- */
let selectedCaptionStyle = "hormozi"; // default

function selectCaptionStyle(style, btn) {
  selectedCaptionStyle = style;
  
  // Update active style pill in DOM
  const pills = btn.closest('.style-pills');
  if (pills) {
    pills.querySelectorAll('.style-pill-btn').forEach(b => b.classList.remove('active'));
  }
  btn.classList.add('active');
}

/* ---- Burn Captions E2E Flow ---- */
async function burnCaptionsE2E() {
  const activeLang = window._captionActiveLang;
  const data = window._captionData;
  const srtContent = data?.captions?.[activeLang]?.srt;

  if (!srtContent) {
    return window.showToast("SRT Missing", "No captions found for the active language. Re-generate first.", "warning");
  }

  // Get uploaded video file if already uploaded
  const videoInput = document.getElementById("videoFile");
  let file = videoInput?.files[0];

  if (!file) {
    // If no video was uploaded, prompt the user to upload one now
    const uploadPrompt = confirm("No video file is loaded. Please select a video file (.mp4, .mov, etc.) to burn these captions onto.");
    if (!uploadPrompt) return;

    // Trigger a file input dialog dynamically
    const dynamicInput = document.createElement("input");
    dynamicInput.type = "file";
    dynamicInput.accept = "video/*";
    dynamicInput.onchange = async () => {
      const selectedFile = dynamicInput.files[0];
      if (selectedFile) {
        await executeBurnRequest(selectedFile, srtContent, selectedCaptionStyle);
      }
    };
    dynamicInput.click();
  } else {
    // Video is already loaded from the dropzone
    await executeBurnRequest(file, srtContent, selectedCaptionStyle);
  }
}

async function executeBurnRequest(videoFile, srtString, styleName) {
  const btn = document.getElementById("burnVideoBtn");
  const progressContainer = document.getElementById("burnProgress");
  const progressFill = document.getElementById("burnProgressFill");
  const progressStatus = document.getElementById("burnProgressStatus");
  const errorBanner = document.getElementById("burnErrorBanner");
  const errorMsg = document.getElementById("burnErrorMsg");

  // Reset UI states
  if (errorBanner) errorBanner.style.display = "none";
  if (btn) btn.disabled = true;

  if (progressContainer) progressContainer.style.display = "block";
  if (progressFill) progressFill.style.width = "10%";
  if (progressStatus) progressStatus.textContent = "Uploading video & preparing captions...";

  // Create form data
  const fd = new FormData();
  fd.append("video", videoFile);
  fd.append("srt", srtString);
  fd.append("style", styleName);

  // Use a simulated progress interval since standard fetch doesn't support upload progress naturally
  let progress = 10;
  const progressInterval = setInterval(() => {
    if (progress < 90) {
      progress += Math.floor(Math.random() * 8) + 2;
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressStatus) {
        if (progress < 30) progressStatus.textContent = "Uploading video to processing unit...";
        else if (progress < 60) progressStatus.textContent = "Analyzing video properties and rendering style filters...";
        else progressStatus.textContent = "Applying style outlines and rendering output video...";
      }
    }
  }, 1000);

  try {
    const res = await fetch("/api/captions/burn", {
      method: "POST",
      body: fd
    });

    clearInterval(progressInterval);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Server failed to process the request.");
    }

    if (progressFill) progressFill.style.width = "100%";
    if (progressStatus) progressStatus.textContent = "Done! Downloading processed video...";

    // Retrieve file blob from response stream
    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    
    // Trigger download
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `creo_burned_${styleName}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    window.showToast("Video Processed Successfully", "Your captioned video has been downloaded.", "success");
    
    // Fade out progress indicator
    setTimeout(() => {
      if (progressContainer) progressContainer.style.display = "none";
    }, 2000);

  } catch (err) {
    clearInterval(progressInterval);
    console.error("Burn pipeline error:", err);

    if (progressContainer) progressContainer.style.display = "none";
    
    if (errorBanner && errorMsg) {
      errorBanner.style.display = "block";
      errorMsg.textContent = err.message || "Failed to render video captions.";
    }
    
    window.showToast("Processing Failed", err.message || "Could not burn captions.", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ---- Top-of-Page Error Banner Helpers ---- */
function showCaptionError(msg) {
  const banner = document.getElementById('captionErrorBanner');
  const msgEl = document.getElementById('captionErrorMsg');
  if (banner && msgEl) {
    msgEl.textContent = msg;
    banner.style.display = 'flex';
    // Smooth scroll to top of caption view so error is clearly visible
    const container = document.getElementById('caption-view');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function hideCaptionError() {
  const banner = document.getElementById('captionErrorBanner');
  if (banner) {
    banner.style.display = 'none';
  }
}