const LANGUAGES = [
  { code: 'en', name: 'English', flag: 'EN', top: true },
  { code: 'hi', name: 'Hindi', flag: 'HI', top: true },
  { code: 'es', name: 'Spanish', flag: 'ES', top: true },
  { code: 'fr', name: 'French', flag: 'FR', top: true },
  { code: 'ar', name: 'Arabic', flag: 'AR', top: true },
  { code: 'pt', name: 'Portuguese', flag: 'PT', top: true },
  { code: 'de', name: 'German', flag: 'DE', top: true },
  { code: 'zh', name: 'Chinese', flag: 'ZH', top: true },
  { code: 'ja', name: 'Japanese', flag: 'JA', top: true },
  { code: 'ko', name: 'Korean', flag: 'KO', top: true },
  { code: 'it', name: 'Italian', flag: 'IT', top: false },
  { code: 'ru', name: 'Russian', flag: 'RU', top: false },
  { code: 'tr', name: 'Turkish', flag: 'TR', top: false },
  { code: 'nl', name: 'Dutch', flag: 'NL', top: false },
];

let selectedLangs = new Set(['en', 'hi', 'es']);

function toggleLangCard(code, el) {
  const check = el.querySelector('.check-circle');

  if (selectedLangs.has(code)) {
    selectedLangs.delete(code);
    el.classList.remove('active');
    if (code === 'en') el.classList.remove('primary');
    check.classList.add('empty');
    check.innerHTML = '';
    return;
  }

  selectedLangs.add(code);
  el.classList.add('active');
  check.classList.remove('empty');
  check.innerHTML = '<i class="fa-solid fa-check"></i>';
}

function selectAllLangs() {
  document.querySelectorAll('.lang-cards-grid .lang-card:not(.add-more)').forEach(el => {
    const codeMatch = el.getAttribute('onclick')?.match(/'([^']+)'/);
    if (!codeMatch) return;

    const code = codeMatch[1];
    if (!selectedLangs.has(code)) toggleLangCard(code, el);
  });
}

function clearLangs() {
  document.querySelectorAll('.lang-cards-grid .lang-card:not(.add-more)').forEach(el => {
    const codeMatch = el.getAttribute('onclick')?.match(/'([^']+)'/);
    if (!codeMatch) return;

    const code = codeMatch[1];
    if (selectedLangs.has(code)) toggleLangCard(code, el);
  });
}

function switchCapTab(name, btnEl) {
  document.querySelectorAll('#caption-view .tab-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  document.querySelectorAll('#caption-view .in-tab').forEach(tab => tab.classList.remove('active'));

  const targetPanel = document.getElementById('tab-' + name);
  if (targetPanel) targetPanel.style.display = 'block';
  if (btnEl) btnEl.classList.add('active');
}

function toggleFormatNew(el) {
  el.classList.toggle('active');
}

function handleFile(input, type) {
  const file = input.files[0];
  if (!file) return;

  const el = document.getElementById(type + 'FileName');
  if (el) el.textContent = 'Selected: ' + file.name;
}

function initCaptionStudio() {
  ['videoDropzone', 'audioDropzone'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('dragover', e => {
      e.preventDefault();
      el.classList.add('drag-over');
    });

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

function getActiveInput() {
  const activePanel = document.querySelector('#caption-view .tab-panel:not([style*="display: none"])');
  if (!activePanel) return null;

  if (activePanel.id === 'tab-transcript') {
    return { type: 'transcript', value: document.getElementById('transcriptInput').value.trim() };
  }
  if (activePanel.id === 'tab-url') {
    return { type: 'url', value: document.getElementById('urlInput').value.trim() };
  }
  if (activePanel.id === 'tab-video') {
    return { type: 'video', file: document.getElementById('videoFile').files[0] };
  }
  if (activePanel.id === 'tab-audio') {
    return { type: 'audio', file: document.getElementById('audioFile').files[0] };
  }

  return null;
}

async function generateCaptions() {
  const input = getActiveInput();
  if (!input) return;

  const langs = [...selectedLangs];
  const formats = [...document.querySelectorAll('.fmt-chip.active')].map(el => el.dataset.fmt);

  if (!langs.length) return alert('Select at least one language.');
  if (!formats.length) return alert('Select at least one format.');
  if (input.type === 'transcript' && !input.value) return alert('Paste some text.');
  if (input.type === 'url' && !input.value) return alert('Enter a YouTube URL.');
  if ((input.type === 'video' || input.type === 'audio') && !input.file) return alert('Select a file.');

  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>Generating...</span>';

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
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Generate Again</span><span>&rarr;</span>';
  }
}

function renderCaptionResults(data, langs, formats) {
  const tabsEl = document.getElementById('captionTabs');
  const outputsEl = document.getElementById('captionOutputs');
  const langMap = Object.fromEntries(LANGUAGES.map(l => [l.code, l]));

  tabsEl.innerHTML = langs.map((code, i) => {
    const lang = langMap[code] || { flag: code.toUpperCase(), name: code };
    return `<button class="caption-tab ${i === 0 ? 'active' : ''}" onclick="switchCaptionTab('${code}', this)">${lang.flag} ${lang.name}</button>`;
  }).join('');

  outputsEl.innerHTML = langs.map((code, i) => {
    const lang = langMap[code] || { flag: code.toUpperCase(), name: code };
    const captions = data.captions?.[code] || {};
    const defFmt = formats[0] || 'txt';

    return `
      <div class="caption-output ${i === 0 ? 'active' : ''}" id="output-${code}">
        <div class="caption-box">
          <div class="caption-box-header">
            <div class="caption-box-lang">${lang.flag} ${lang.name}</div>
            <div class="caption-box-actions">
              <div class="format-switcher">
                ${formats.map(f =>
                  `<button class="fmt-btn ${f === defFmt ? 'active' : ''}" onclick="switchFormat('${code}','${f}',this)">${f.toUpperCase()}</button>`
                ).join('')}
              </div>
              <button class="caption-action" onclick="copyCaption('${code}')">Copy</button>
              <button class="caption-action" onclick="downloadCaption('${code}')">Download</button>
            </div>
          </div>
          <div class="caption-text" id="caption-text-${code}">${captions[defFmt] || 'No content.'}</div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('resultsCount').textContent =
    langs.length + ' language' + (langs.length > 1 ? 's' : '') + ' - ' + formats.join(', ').toUpperCase();

  const results = document.getElementById('results');
  results.style.display = 'block';
  results.classList.add('show');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  window._captionData = data;
  window._captionFormats = formats;
}

function switchCaptionTab(code, btn) {
  document.querySelectorAll('.caption-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.caption-output').forEach(output => output.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('output-' + code).classList.add('active');
}

function switchFormat(code, fmt, btn) {
  const parent = btn.closest('.caption-box');
  parent.querySelectorAll('.fmt-btn').forEach(button => button.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('caption-text-' + code).textContent =
    window._captionData?.captions?.[code]?.[fmt] || 'No content.';
}

function copyCaption(code) {
  const btn = window.event?.target;
  navigator.clipboard.writeText(document.getElementById('caption-text-' + code).textContent).catch(() => {});

  if (!btn) return;
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}

function downloadCaption(code) {
  const textEl = document.getElementById('caption-text-' + code);
  const fmt = document.querySelector(`#output-${code} .fmt-btn.active`)?.textContent?.trim()?.toLowerCase() || 'txt';
  const a = document.createElement('a');

  a.href = URL.createObjectURL(new Blob([textEl.textContent], { type: 'text/plain' }));
  a.download = `captions_${code}.${fmt}`;
  a.click();
}

if (document.getElementById('caption-view')) {
  initCaptionStudio();
} else {
  document.addEventListener('aurora:partials-loaded', initCaptionStudio, { once: true });
}
