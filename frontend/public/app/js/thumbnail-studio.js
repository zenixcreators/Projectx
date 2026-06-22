/* =========================================
  THUMBNAIL STUDIO — VISION AUDIT LOGIC
========================================= */

let selectedImageFile = null;
let selectedYoutubeUrl = null;
let currentSourceMode = 'upload'; // 'upload' or 'url'

function fetchWithTimeout(url, options = {}, timeoutMs = 50000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal
  })
    .then(response => {
      clearTimeout(id);
      return response;
    })
    .catch(error => {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error("Request timed out. The upload is taking longer than expected. Please verify your internet connection speed and try again.");
      }
      throw error;
    });
}

// Initialize listeners on load & dynamic reload
document.addEventListener('creo:partials-loaded', initThumbnailStudio);

// Fallback init
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initThumbnailStudio, 100);
} else {
  document.addEventListener('DOMContentLoaded', initThumbnailStudio);
}

function initThumbnailStudio() {
  resetAll();
  initUploadListeners();

  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    const newBtn = analyzeBtn.cloneNode(true);
    analyzeBtn.parentNode.replaceChild(newBtn, analyzeBtn);
    newBtn.addEventListener('click', () => handleAnalyzeClick(newBtn));
  }
}

function initUploadListeners() {
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('thumbUploadInput');
  const resetBtn = document.getElementById('resetBtn');

  if (!dropzone || !fileInput) return;

  // Clicking the dropzone opens file picker
  dropzone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  // Drag & drop visual effects
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#7c5cff';
    dropzone.style.background = 'rgba(124, 92, 255, 0.05)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    dropzone.style.background = '';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    dropzone.style.background = '';

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  if (resetBtn) {
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    newResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetAll();
    });
  }
}

window.switchMediaSource = function (mode) {
  if (mode === currentSourceMode) return;
  currentSourceMode = mode;

  const btnUpload = document.getElementById('tabSourceUpload');
  const btnUrl = document.getElementById('tabSourceUrl');
  const uploadPanel = document.getElementById('uploadDropzone');
  const urlPanel = document.getElementById('urlInputContainer');

  if (mode === 'upload') {
    btnUpload.classList.add('active');
    btnUpload.style.color = '#ffffff';
    btnUrl.classList.remove('active');
    btnUrl.style.color = '#a7a4ae';

    uploadPanel.style.display = 'block';
    urlPanel.style.display = 'none';
  } else {
    btnUrl.classList.add('active');
    btnUrl.style.color = '#ffffff';
    btnUpload.classList.remove('active');
    btnUpload.style.color = '#a7a4ae';

    urlPanel.style.display = 'block';
    uploadPanel.style.display = 'none';
  }

  resetAll();
};

window.loadYoutubeThumbnail = function () {
  const urlInput = document.getElementById('ytVideoUrl');
  const preview = document.getElementById('urlThumbnailPreview');
  const form = document.getElementById('urlInputForm');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resetBtn = document.getElementById('resetBtn');

  if (!urlInput) return;

  const url = urlInput.value.trim();
  if (!url) {
    window.showToast("URL Required", "Please enter a valid YouTube video link.", "warning");
    return;
  }

  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (!match) {
    window.showToast("Invalid URL", "Could not extract YouTube video ID from URL.", "warning");
    return;
  }
  const videoId = match[1];

  selectedYoutubeUrl = url;

  // Use maxresdefault for clean, high-fidelity UI preview
  const imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  if (preview && form) {
    preview.onload = () => {
      form.style.display = 'none';
      preview.style.display = 'block';
      if (analyzeBtn) analyzeBtn.disabled = false;
      if (resetBtn) resetBtn.style.display = 'block';
    };

    preview.onerror = () => {
      // Fallback to hqdefault
      preview.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      preview.onerror = () => {
        window.showToast("Load Failed", "Could not download YouTube preview. Check video link.", "error");
        resetAll();
      };
    };

    preview.src = imageUrl;
  }
};

function handleFileSelected(file) {
  const preview = document.getElementById('mainThumbnail');
  const placeholder = document.getElementById('thumbPlaceholder');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resetBtn = document.getElementById('resetBtn');

  if (file.type.startsWith('video/')) {
    window.showToast("Extracting Frame", "Reading video file to capture a thumbnail frame...", "info");

    if (placeholder) {
      const textSpan = placeholder.querySelector('span:first-of-type');
      const subtextSpan = placeholder.querySelector('span:last-of-type');
      const icon = placeholder.querySelector('i');
      if (textSpan) textSpan.textContent = "EXTRACTING VIDEO FRAME...";
      if (subtextSpan) subtextSpan.textContent = "Please wait a moment while we capture a screenshot...";
      if (icon) {
        icon.className = "fa-solid fa-spinner fa-spin";
        icon.style.color = "#7c5cff";
      }
    }

    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.0, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const imageFile = new File([blob], "extracted_frame.jpg", { type: "image/jpeg" });
            selectedImageFile = imageFile;

            const reader = new FileReader();
            reader.onload = (e) => {
              if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
              }
              if (placeholder) placeholder.style.display = 'none';
              if (analyzeBtn) analyzeBtn.disabled = false;
              if (resetBtn) resetBtn.style.display = 'block';
            };
            reader.readAsDataURL(imageFile);

            window.showToast("Video Frame Loaded", "Successfully captured video frame for vision audit!", "success");
          }
        }, 'image/jpeg');
      } catch (err) {
        console.error('[VideoFrameExtract] Error:', err);
        window.showToast("Frame Capture Failed", "Could not extract video frame. Please upload an image directly.", "error");
        resetAll();
      } finally {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = () => {
      window.showToast("Video Error", "Could not read video file. Please try another video or an image.", "error");
      resetAll();
    };

    return;
  }

  if (!file.type.startsWith('image/')) {
    window.showToast("Invalid File Type", "Please upload an image (PNG, JPG) or video file (MP4, WEBM).", "warning");
    return;
  }

  selectedImageFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    if (preview) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (analyzeBtn) analyzeBtn.disabled = false;
    if (resetBtn) resetBtn.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

let loaderInterval = null;

function startLoaderAnimation() {
  const loader = document.getElementById('analysisLoader');
  const resultsContainer = document.getElementById('analysisResults');
  const errorPanel = document.getElementById('analysisErrorState');
  const progressText = document.getElementById('loaderProgressText');

  if (resultsContainer) resultsContainer.style.display = 'none';
  if (errorPanel) errorPanel.style.display = 'none';
  if (loader) loader.style.display = 'flex';

  if (progressText) progressText.textContent = "Initializing vision audit...";

  const steps = [
    "Analyzing layout & rule of thirds...",
    "Extracting color palette hex codes...",
    "Coupling hex codes with color temperature...",
    "Auditing subject focal points & framing...",
    "Scanning typography size & readability...",
    "Measuring composition lighting & depth...",
    "Calculating click-through psychological triggers...",
    "Resolving cognitive viewer intent...",
    "Synthesizing recreation prompt scripts..."
  ];

  let stepIdx = 0;
  clearInterval(loaderInterval);
  loaderInterval = setInterval(() => {
    if (progressText && stepIdx < steps.length) {
      progressText.textContent = steps[stepIdx];
      stepIdx++;
    } else {
      clearInterval(loaderInterval);
    }
  }, 750);
}

function stopLoaderAnimation() {
  clearInterval(loaderInterval);
  const loader = document.getElementById('analysisLoader');
  if (loader) loader.style.display = 'none';
}

function showErrorState(title, message) {
  stopLoaderAnimation();
  const resultsContainer = document.getElementById('analysisResults');
  const errorPanel = document.getElementById('analysisErrorState');
  const errorTitle = document.getElementById('errorStateTitle');
  const errorMsg = document.getElementById('errorStateMsg');

  if (resultsContainer) resultsContainer.style.display = 'none';
  if (errorPanel) errorPanel.style.display = 'flex';

  if (errorTitle) errorTitle.textContent = title || "Analysis Interrupted";
  if (errorMsg) errorMsg.textContent = message || "An unexpected error occurred. Please check your file and try again.";
}

function resetAll() {
  selectedImageFile = null;
  selectedYoutubeUrl = null;

  const fileInput = document.getElementById('thumbUploadInput');
  if (fileInput) fileInput.value = '';

  const ytInput = document.getElementById('ytVideoUrl');
  if (ytInput) ytInput.value = '';

  const preview = document.getElementById('mainThumbnail');
  const urlPreview = document.getElementById('urlThumbnailPreview');
  const placeholder = document.getElementById('thumbPlaceholder');
  const urlForm = document.getElementById('urlInputForm');

  const analyzeBtn = document.getElementById('analyzeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const resultsContainer = document.getElementById('analysisResults');
  const loader = document.getElementById('analysisLoader');
  const errorPanel = document.getElementById('analysisErrorState');

  if (loader) loader.style.display = 'none';
  if (errorPanel) errorPanel.style.display = 'none';
  stopLoaderAnimation();

  if (preview) {
    preview.onload = null;
    preview.onerror = null;
    preview.src = '';
    preview.style.display = 'none';
  }
  if (urlPreview) {
    urlPreview.onload = null;
    urlPreview.onerror = null;
    urlPreview.src = '';
    urlPreview.style.display = 'none';
  }
  if (placeholder) {
    placeholder.style.display = 'flex';
    const textSpan = placeholder.querySelector('span:first-of-type');
    const subtextSpan = placeholder.querySelector('span:last-of-type');
    const icon = placeholder.querySelector('i');
    if (textSpan) textSpan.textContent = "CHOOSE IMAGE OR VIDEO";
    if (subtextSpan) subtextSpan.textContent = "Drag & drop visual file here or click to browse";
    if (icon) {
      icon.className = "fa-solid fa-photo-film";
      icon.style.color = "";
    }
  }
  if (urlForm) {
    urlForm.style.display = 'flex';
  }

  if (analyzeBtn) analyzeBtn.disabled = true;
  if (resetBtn) resetBtn.style.display = 'none';
  if (resultsContainer) resultsContainer.style.display = 'none';

  resetThumbnailDna();
}

function handleAnalyzeClick(btn) {
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `
    <div class="spinner"></div>
    <span>Analyzing...</span>
  `;
  btn.disabled = true;

  setGeneratingState();
  startLoaderAnimation();

  if (currentSourceMode === 'url') {
    if (!selectedYoutubeUrl) {
      window.showToast("No URL Loaded", "Please load a valid YouTube URL first.", "warning");
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      stopLoaderAnimation();
      return;
    }

    fetchWithTimeout('/api/analyze-thumbnail-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: selectedYoutubeUrl })
    })
      .then(response => response.json().then(data => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.success || !data.data) {
          throw new Error(data.error || "Vision analysis failed.");
        }

        const payload = data.data;

        // Verify if the model flagged the image as blurry or invalid
        if (payload.error && payload.error.is_invalid) {
          showErrorState("Invalid Image Uploaded", payload.error.reason);
          return;
        }

        // Show the extracted base64 image on the URL preview node to keep it visible
        const urlPreview = document.getElementById('urlThumbnailPreview');
        if (urlPreview && data.extractedThumbnailUrl) {
          urlPreview.src = data.extractedThumbnailUrl;
          urlPreview.style.display = 'block';
        }

        stopLoaderAnimation();
        updateDnaPanel(payload);
        showDetailedReport(payload);

        window.showToast("Audit Complete", "URL design audit report is ready!", "success");
      })
      .catch(error => {
        console.error('[ThumbnailStudio] URL Analysis failed:', error);
        let userFriendlyMsg = error.message || "An error occurred during vision processing.";
        if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
          userFriendlyMsg = "Network connection failed. Please check if your computer is online and try again.";
        }
        window.showToast("Analysis Failed", userFriendlyMsg, "error");
        showErrorState("Audit Failed", userFriendlyMsg);
        resetSidebarOnFail();
      })
      .finally(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      });

  } else {
    if (!selectedImageFile) {
      window.showToast("No File Selected", "Please upload a thumbnail image or video.", "warning");
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      stopLoaderAnimation();
      return;
    }

    const formData = new FormData();
    formData.append('thumbnailImage', selectedImageFile);

    fetchWithTimeout('/api/analyze-thumbnail', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json().then(data => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.success || !data.data) {
          throw new Error(data.error || "Vision analysis failed.");
        }

        const payload = data.data;

        // Verify if the model flagged the image as blurry or invalid
        if (payload.error && payload.error.is_invalid) {
          showErrorState("Invalid Image Uploaded", payload.error.reason);
          return;
        }

        stopLoaderAnimation();
        updateDnaPanel(payload);
        showDetailedReport(payload);

        window.showToast("Audit Complete", "Design audit report is ready!", "success");
      })
      .catch(error => {
        console.error('[ThumbnailStudio] Analysis failed:', error);
        let userFriendlyMsg = error.message || "An error occurred during vision processing.";
        if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
          userFriendlyMsg = "Network connection failed. Please check if your computer is online and try again.";
        }
        window.showToast("Analysis Failed", userFriendlyMsg, "error");
        showErrorState("Audit Failed", userFriendlyMsg);
        resetSidebarOnFail();
      })
      .finally(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      });
  }
}

function setGeneratingState() {
  const score = document.getElementById("dnaScore");
  const status = document.getElementById("dnaScoreStatus");
  const scoreBar = document.getElementById("dnaScoreBar");

  if (score) score.textContent = "--/10";
  if (status) status.textContent = "Analyzing...";
  if (scoreBar) {
    scoreBar.classList.add("empty");
    scoreBar.style.width = "0%";
  }
}

function resetSidebarOnFail() {
  const status = document.getElementById("dnaScoreStatus");
  if (status) status.textContent = "Failed";
}

function resetThumbnailDna() {
  const score = document.getElementById("dnaScore");
  const status = document.getElementById("dnaScoreStatus");
  const scoreBar = document.getElementById("dnaScoreBar");
  const attentionDesc = document.getElementById("dnaAttentionDesc");
  const trigger = document.getElementById("dnaTrigger");
  const triggerDesc = document.getElementById("dnaTriggerDesc");
  const archetype = document.getElementById("dnaArchetype");
  const swatchesWrap = document.getElementById("dnaSwatches");
  const colorDesc = document.getElementById("dnaColorDesc");
  const intentTitle = document.getElementById("dnaIntent");
  const intentDesc = document.getElementById("dnaIntentDesc");
  const eyeFlow = document.getElementById("dnaEyeFlow");
  const mobileScore = document.getElementById("dnaMobileScore");
  const mobileDesc = document.getElementById("dnaMobileDesc");

  if (score) score.textContent = "--/10";
  if (status) status.textContent = "Awaiting upload";
  if (scoreBar) {
    scoreBar.classList.add("empty");
    scoreBar.style.width = "0%";
  }
  if (attentionDesc) attentionDesc.textContent = "Upload design files or input YouTube link to perform vision AI audit analysis.";
  if (trigger) trigger.textContent = "--";
  if (triggerDesc) triggerDesc.textContent = "--";
  if (archetype) archetype.textContent = "--";
  if (colorDesc) colorDesc.textContent = "--";
  if (intentTitle) intentTitle.textContent = "--";
  if (intentDesc) intentDesc.textContent = "--";
  if (eyeFlow) eyeFlow.textContent = "--";
  if (mobileScore) mobileScore.textContent = "-- / 10";
  if (mobileDesc) mobileDesc.textContent = "--";
  if (swatchesWrap) {
    swatchesWrap.innerHTML = [1, 2, 3, 4].map(() => '<div class="dna-swatch muted"></div>').join("");
  }
}

function getNestedValue(obj, paths, fallback = "--") {
  for (const path of paths) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }
    if (current !== null && current !== undefined && current !== "") {
      return current;
    }
  }
  return fallback;
}

function updateDnaPanel(payload) {
  const analysis = payload.analysis || {};

  const score = document.getElementById("dnaScore");
  const status = document.getElementById("dnaScoreStatus");
  const scoreBar = document.getElementById("dnaScoreBar");
  const attentionDesc = document.getElementById("dnaAttentionDesc");

  const urgency = Number(getNestedValue(analysis, ['mood_and_trigger.emotional_register.urgency', 'emotional_register.urgency'], 5));
  const trust = Number(getNestedValue(analysis, ['mood_and_trigger.emotional_register.trust', 'emotional_register.trust'], 5));
  const excitement = Number(getNestedValue(analysis, ['mood_and_trigger.emotional_register.excitement', 'emotional_register.excitement'], 5));

  const compositeScore = Math.round(((urgency + trust + excitement) / 3) * 10) / 10;

  if (score) score.textContent = `${compositeScore}/10`;

  let scoreStatusText = "Average";
  if (compositeScore >= 8) scoreStatusText = "Excellent";
  else if (compositeScore >= 6) scoreStatusText = "Strong";
  else if (compositeScore < 4) scoreStatusText = "Weak";

  if (status) {
    status.textContent = scoreStatusText;
    status.style.color = (compositeScore >= 8) ? "#10b981" : ((compositeScore >= 6) ? "#b89ffd" : "#ef4444");
  }

  if (scoreBar) {
    scoreBar.classList.remove("empty");
    scoreBar.style.width = `${compositeScore * 10}%`;
  }

  if (attentionDesc) {
    attentionDesc.textContent = `Overall thumbnail optimization is ${scoreStatusText.toLowerCase()}. Visual parameters analyzed successfully.`;
  }

  const triggerTitle = document.getElementById("dnaTrigger");
  const triggerDesc = document.getElementById("dnaTriggerDesc");
  const primaryTrigger = getNestedValue(analysis, ['mood_and_trigger.primary_trigger', 'psychological_trigger']);
  const actionIntent = getNestedValue(analysis, ['mood_and_trigger.viewer_action_intent', 'viewer_action_intent']);

  if (triggerTitle) triggerTitle.textContent = primaryTrigger;
  if (triggerDesc) triggerDesc.textContent = actionIntent;

  const dnaArchetype = document.getElementById("dnaArchetype");
  const layoutPattern = getNestedValue(analysis, ['composition.layout_pattern', 'scene.framing']);
  if (dnaArchetype) dnaArchetype.textContent = layoutPattern;

  const swatchesWrap = document.getElementById("dnaSwatches");
  const colorDesc = document.getElementById("dnaColorDesc");
  const dominantBg = getNestedValue(analysis, ['color_palette.dominant_bg', 'colors.dominant']);
  const accentsList = getNestedValue(analysis, ['color_palette.accents', 'colors.accent']);
  const accentsArr = Array.isArray(accentsList) ? accentsList : (typeof accentsList === 'string' ? [accentsList] : []);
  const textColorStr = getNestedValue(analysis, ['color_palette.text_color', 'colors.text_color']);
  const colorTemp = getNestedValue(analysis, ['color_palette.temp', 'mood']);
  const contrastLevel = getNestedValue(analysis, ['color_palette.contrast', 'colors.contrast']);

  if (swatchesWrap) {
    const dominant = dominantBg !== "--" ? dominantBg : "#ccc";
    const accents = accentsArr.length > 0 ? accentsArr : [];
    const textCol = textColorStr !== "--" ? textColorStr : "#fff";

    const allColors = [dominant, ...accents, textCol].filter(Boolean).slice(0, 4);
    swatchesWrap.innerHTML = allColors.map(color => `
      <div class="dna-swatch" style="background:${color}" title="${color}"></div>
    `).join("");
  }
  if (colorDesc) {
    colorDesc.textContent = `Palette style is ${colorTemp} with ${contrastLevel} contrast.`;
  }

  const intentTitle = document.getElementById("dnaIntent");
  const intentDesc = document.getElementById("dnaIntentDesc");
  if (intentTitle) intentTitle.textContent = primaryTrigger;
  if (intentDesc) intentDesc.textContent = actionIntent;

  const eyeFlow = document.getElementById("dnaEyeFlow");
  const elementHierarchy = getNestedValue(analysis, ['composition.element_hierarchy', 'composition.hierarchy_flow']);
  if (eyeFlow) eyeFlow.textContent = elementHierarchy;

  const mobileScore = document.getElementById("dnaMobileScore");
  const mobileDesc = document.getElementById("dnaMobileDesc");
  const textSizeVal = getNestedValue(analysis, ['typography.size', 'text_overlay.size']);
  const textPosVal = getNestedValue(analysis, ['typography.position', 'text_overlay.position']);

  let sizeScore = 7;
  const rawSize = String(textSizeVal).toLowerCase();
  if (rawSize.includes("dominant") || rawSize.includes("large")) sizeScore = 9;
  else if (rawSize.includes("medium")) sizeScore = 7;
  else if (rawSize.includes("small")) sizeScore = 4;

  if (mobileScore) mobileScore.textContent = `${sizeScore} / 10`;
  if (mobileDesc) {
    mobileDesc.textContent = `Font size is ${textSizeVal} placed at ${textPosVal}.`;
  }
}

function showDetailedReport(payload) {
  const analysis = payload.analysis || {};

  setTextContent("valCompositionPattern", getNestedValue(analysis, ['composition.layout_pattern', 'scene.framing']));
  setTextContent("valCompositionFraming", getNestedValue(analysis, ['composition.framing', 'scene.framing']));
  setTextContent("valCompositionThirds", getNestedValue(analysis, ['composition.rule_of_thirds']));
  setTextContent("valCompositionHierarchy", getNestedValue(analysis, ['composition.element_hierarchy', 'composition.hierarchy_flow']));

  setTextContent("valSubjectDesc", getNestedValue(analysis, ['subject.description', 'subject.desc']));
  setTextContent("valSubjectExpression", getNestedValue(analysis, ['subject.expression']));
  setTextContent("valSubjectGestures", getNestedValue(analysis, ['subject.body_language', 'subject.gesture']));
  setTextContent("valSubjectClothing", getNestedValue(analysis, ['subject.clothing']));

  setTextContent("valTextContent", getNestedValue(analysis, ['typography.text_visible', 'text_overlay.content']));
  setTextContent("valFontStyle", getNestedValue(analysis, ['typography.font_style', 'text_overlay.style']));
  setTextContent("valFontSize", getNestedValue(analysis, ['typography.size', 'text_overlay.size']));
  setTextContent("valTextPosition", getNestedValue(analysis, ['typography.position', 'text_overlay.position']));

  setTextContent("valLightingStyle", getNestedValue(analysis, ['lighting.style', 'lighting']));
  setTextContent("valLightingDirection", getNestedValue(analysis, ['lighting.direction']));
  setTextContent("valLightingShadows", getNestedValue(analysis, ['lighting.shadows']));
  setTextContent("valLightingDof", getNestedValue(analysis, ['lighting.depth_of_field', 'scene.depth']));

  setTextContent("valTriggerType", getNestedValue(analysis, ['mood_and_trigger.primary_trigger', 'psychological_trigger']));
  setTextContent("valViewerIntent", getNestedValue(analysis, ['mood_and_trigger.viewer_action_intent', 'viewer_action_intent']));
  setTextContent("valColorTemp", getNestedValue(analysis, ['color_palette.temp', 'mood']));
  setTextContent("valContrastLevel", getNestedValue(analysis, ['color_palette.contrast', 'colors.contrast']));

  setTextContent("promptPlainText", payload.prompt_plain);
  setTextContent("promptImageGenText", payload.generation_prompt);

  const jsonText = document.getElementById("promptJsonText");
  if (jsonText) {
    jsonText.textContent = JSON.stringify(payload.prompt_json, null, 2);
  }

  const variationsContainer = document.getElementById("variationsContainer");
  if (variationsContainer && Array.isArray(payload.adjacent_variants)) {
    variationsContainer.innerHTML = payload.adjacent_variants.map((variant, idx) => `
      <div class="dna-card prompt-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="dna-label">${variant.label || `Variation ${idx + 1}`}</span>
          <button class="copy-prompt-btn" onclick="copyText('promptVariant${idx}')">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>
        <p id="promptVariant${idx}" class="prompt-text-block" style="font-weight: 600;">${variant.prompt}</p>
      </div>
    `).join("");
  }

  const resultsContainer = document.getElementById('analysisResults');
  if (resultsContainer) {
    resultsContainer.style.display = 'block';
  }

  // Populate the Summary tab
  populateSummaryTab(payload);
}

function populateSummaryTab(payload) {
  const analysis = payload.analysis || {};

  // Score
  const urgency   = Number(getNestedValue(analysis, ['mood_and_trigger.emotional_register.urgency', 'emotional_register.urgency'], 5));
  const trust     = Number(getNestedValue(analysis, ['mood_and_trigger.emotional_register.trust',   'emotional_register.trust'],   5));
  const excitement= Number(getNestedValue(analysis, ['mood_and_trigger.emotional_register.excitement','emotional_register.excitement'], 5));
  const compositeScore = Math.round(((urgency + trust + excitement) / 3) * 10) / 10;

  let verdict = 'Average';
  if (compositeScore >= 8) verdict = 'Excellent';
  else if (compositeScore >= 6) verdict = 'Strong';
  else if (compositeScore < 4) verdict = 'Needs Work';

  const scoreEl = document.getElementById('summaryScore');
  if (scoreEl) {
    scoreEl.textContent = `${compositeScore}/10`;
    scoreEl.style.background = compositeScore >= 8
      ? 'linear-gradient(135deg, #34C759, #30D158)'
      : compositeScore >= 6
        ? 'linear-gradient(135deg, #007AFF, #34AADC)'
        : 'linear-gradient(135deg, #FF3B30, #FF6961)';
  }
  setTextContent('summaryVerdict', verdict);
  setTextContent('summaryArchetype', getNestedValue(analysis, ['composition.layout_pattern', 'scene.framing']));

  // Narrative — build a full paragraph from all analysis fields
  const subject    = getNestedValue(analysis, ['subject.description', 'subject.desc']);
  const trigger    = getNestedValue(analysis, ['mood_and_trigger.primary_trigger', 'psychological_trigger']);
  const layout     = getNestedValue(analysis, ['composition.layout_pattern', 'scene.framing']);
  const textVis    = getNestedValue(analysis, ['typography.text_visible', 'text_overlay.content']);
  const colorTemp  = getNestedValue(analysis, ['color_palette.temp', 'mood']);
  const contrast   = getNestedValue(analysis, ['color_palette.contrast', 'colors.contrast']);
  const lighting   = getNestedValue(analysis, ['lighting.style', 'lighting']);
  const intent     = getNestedValue(analysis, ['mood_and_trigger.viewer_action_intent', 'viewer_action_intent']);
  const textSize   = getNestedValue(analysis, ['typography.size', 'text_overlay.size']);
  const textPos    = getNestedValue(analysis, ['typography.position', 'text_overlay.position']);

  const narrative = `This thumbnail features ${subject !== '--' ? subject : 'a primary subject'} positioned using a ${layout} layout. `
    + `The primary psychological trigger is "${trigger}", designed to drive "${intent}". `
    + `Typography ${textVis !== '--' ? `reading "${textVis}"` : ''} is placed at ${textPos} in a ${textSize} relative size, contributing to ${verdict.toLowerCase()} mobile readability. `
    + `The color palette is ${colorTemp} with ${contrast} contrast, complemented by ${lighting} lighting. `
    + `Overall, this thumbnail scores ${compositeScore}/10 on attention strength — ${
        compositeScore >= 8 ? 'a top-tier design ready to compete in high-traffic feeds.'
      : compositeScore >= 6 ? 'a solid design with room for minor refinements.'
      : 'a design that could benefit from stronger visual hierarchy and clearer focal points.'}`;

  setTextContent('summaryNarrative', narrative);

  // Strengths
  const strengthsEl = document.getElementById('summaryStrengths');
  if (strengthsEl) {
    const strengths = [];
    if (compositeScore >= 7) strengths.push('Strong emotional resonance score');
    if (contrast && contrast.toLowerCase().includes('high')) strengths.push('High contrast for visibility');
    if (textSize && (textSize.toLowerCase().includes('large') || textSize.toLowerCase().includes('dominant'))) strengths.push('Dominant, readable text size');
    if (trigger && trigger !== '--') strengths.push(`Clear psychological trigger: ${trigger}`);
    if (lighting && lighting !== '--') strengths.push(`Effective ${lighting} lighting`);
    if (strengths.length === 0) strengths.push('Consistent visual style');
    strengthsEl.innerHTML = strengths.map(s => `<li><i class="fa-solid fa-check"></i> ${s}</li>`).join('');
  }

  // Weaknesses
  const weaknessesEl = document.getElementById('summaryWeaknesses');
  if (weaknessesEl) {
    const weaknesses = [];
    if (compositeScore < 6) weaknesses.push('Low attention score — needs stronger hook');
    if (contrast && contrast.toLowerCase().includes('low')) weaknesses.push('Low contrast reduces click-through potential');
    if (textSize && textSize.toLowerCase().includes('small')) weaknesses.push('Text too small for mobile feeds');
    if (!textVis || textVis === '--') weaknesses.push('No visible text overlay detected');
    if (weaknesses.length === 0) weaknesses.push('No critical issues detected');
    weaknessesEl.innerHTML = weaknesses.map(w => `<li><i class="fa-solid fa-circle-exclamation"></i> ${w}</li>`).join('');
  }

  // Metric chips
  setTextContent('summaryTrigger', trigger);
  setTextContent('summaryColorTemp', colorTemp);
  setTextContent('summaryLayout', layout);

  // Mobile score chip
  let sizeScore = 7;
  const rawSize = String(textSize).toLowerCase();
  if (rawSize.includes('dominant') || rawSize.includes('large')) sizeScore = 9;
  else if (rawSize.includes('medium')) sizeScore = 7;
  else if (rawSize.includes('small')) sizeScore = 4;
  setTextContent('summaryMobile', `${sizeScore} / 10`);
}

function setTextContent(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = value || '--';
}

window.switchAnalysisTab = function (tabId) {
  // Update tab button active state
  document.querySelectorAll('.analysis-tab-btn').forEach(tab => {
    if (tab.id && tab.id.startsWith('btnTab')) {
      const onclick = tab.getAttribute('onclick') || '';
      if (onclick.includes(tabId)) {
        tab.classList.add('active');
        tab.style.removeProperty('color');
      } else {
        tab.classList.remove('active');
        tab.style.removeProperty('color');
      }
    }
  });

  // Show matching content, hide others
  document.querySelectorAll('.analysis-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
    content.style.display = content.id === `tab-${tabId}` ? 'block' : 'none';
  });
};

window.copyText = function (elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.innerText || el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    window.showToast('Copied to Clipboard', 'Copied successfully!', 'success');
  }).catch(err => {
    window.showToast('Copy Failed', err.message, 'error');
  });
};
