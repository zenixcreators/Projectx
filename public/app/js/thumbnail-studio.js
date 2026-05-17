/* =========================================
  THUMBNAIL STUDIO
========================================= */

// Scope the click listener to the thumbnail view to prevent conflicts with other sections
document.addEventListener('click', (event) => {
  const thumbnailView = document.getElementById('thumbnail-view');
  if (!thumbnailView) return;

  // Only handle clicks that occur within the thumbnail view
  if (!thumbnailView.contains(event.target)) return;

  const generateBtn = event.target.closest('.generate-btnn') || event.target.closest('.generate-btn');
  if (generateBtn) {
    handleGenerateClick(generateBtn);
    return;
  }

  const chip = event.target.closest('.psy-chip');
  if (chip) {
    handleChipClick(chip);
  }
});

document.addEventListener('aurora:partials-loaded', resetThumbnailDna);

function handleGenerateClick(btn) {
  const thumbPrompt = document.getElementById("thumbPrompt");
  const previewImage = document.getElementById("mainThumbnail");

  if (!thumbPrompt) return;

  const originalHTML = btn.innerHTML;
  btn.innerHTML = `
    <div class="spinner"></div>
    <span>Generating...</span>
  `;
  btn.disabled = true;

  const promptValue = thumbPrompt.value.trim();
  if (!promptValue) {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    alert("Please describe the thumbnail you want to generate.");
    return;
  }
  const { provider } = getSelectedModel();
  
  if (!provider) {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    alert("Please select an AI Generation Model before continuing.");
    return;
  }

  setGeneratingState();

  const styleModifier = getActivePsychologyMode();

  fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `${promptValue}. Psychological mode: ${styleModifier}.`,
      provider,
      aspectRatio: getSelectedAspectRatio()
    })
  })
  .then(response => response.json().then(data => ({ ok: response.ok, data })))
  .then(({ ok, data }) => {
    if (!ok || !data.success || !data.imageUrl) {
      throw new Error(data.error || "Generation failed.");
    }

    if (data.dna) updateDnaPanel(data.dna);
    return showGeneratedThumbnail(previewImage, data.imageUrl);
  })
  .then(() => {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  })
  .catch(error => {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    alert("Image generation failed: " + error.message);
  });
}

function getSelectedModel() {
  const select = document.getElementById("thumbModel");
  const provider = select?.value || "";
  return { provider };
}

function getSelectedAspectRatio() {
  const select = document.getElementById("thumbAspectRatio");
  return select?.value || "16:9";
}

function getActivePsychologyMode() {
  const activeChip = document.querySelector('.psy-chip.active');
  return activeChip ? activeChip.textContent.trim() : "Mystery";
}

function showGeneratedThumbnail(previewImage, imageUrl) {
  return new Promise((resolve, reject) => {
    if (!previewImage) {
      reject(new Error("Preview image element is missing."));
      return;
    }

    const placeholder = document.getElementById("thumbPlaceholder");

    previewImage.onload = () => {
      if (placeholder) placeholder.style.display = "none";
      previewImage.style.display = "block";
      previewImage.onload = null;
      previewImage.onerror = null;
      resolve();
    };

    previewImage.onerror = () => {
      previewImage.style.display = "none";
      if (placeholder) placeholder.style.display = "flex";
      previewImage.onload = null;
      previewImage.onerror = null;
      reject(new Error("The generated image did not load."));
    };

    previewImage.src = imageUrl;
  });
}

function handleChipClick(chip) {
  const chips = document.querySelectorAll(".psy-chip");
  chips.forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
}

function setGeneratingState() {
  const score = document.querySelector(".dna-score");
  const status = document.querySelector(".dna-score-status");
  const scoreBar = document.querySelector(".dna-bar-fill");

  if (score) score.textContent = "--/10";
  if (status) status.textContent = "Generating";
  if (scoreBar) {
    scoreBar.classList.add("empty");
    scoreBar.style.width = "0%";
  }
}

function resetThumbnailDna() {
  const score = document.querySelector(".dna-score");
  const status = document.querySelector(".dna-score-status");
  const scoreBar = document.querySelector(".dna-bar-fill");
  const titles = document.querySelectorAll(".dna-title");
  const descs = document.querySelectorAll(".dna-desc");
  const archetype = document.querySelector(".dna-archetype");
  const mobileScore = document.querySelector(".mobile-score");
  const swatchesWrap = document.querySelector(".dna-swatches");

  if (score) score.textContent = "--/10";
  if (status) status.textContent = "Awaiting concept";
  if (scoreBar) {
    scoreBar.classList.add("empty");
    scoreBar.style.width = "0%";
  }

  titles.forEach(title => title.textContent = "--");
  descs.forEach(desc => desc.textContent = "--");
  if (descs[0]) descs[0].textContent = "Generate a thumbnail to calculate attention strength.";
  if (archetype) archetype.textContent = "--";
  if (mobileScore) mobileScore.textContent = "-- / 10";
  if (swatchesWrap) {
    swatchesWrap.innerHTML = [1, 2, 3, 4].map(() => '<div class="dna-swatch muted"></div>').join("");
  }
}

function updateDnaPanel(dna) {
  const score = document.querySelector(".dna-score");
  const status = document.querySelector(".dna-score-status");
  const scoreBar = document.querySelector(".dna-bar-fill");
  const titles = document.querySelectorAll(".dna-title");
  const descriptions = document.querySelectorAll(".dna-desc");
  const archetype = document.querySelector(".dna-archetype");
  const mobileScore = document.querySelector(".mobile-score");
  const swatchesWrap = document.querySelector(".dna-swatches");

  if (score) score.textContent = dna.score || "--/10";
  if (status) status.textContent = dna.scoreStatus || "Analyzed";
  if (scoreBar) {
    scoreBar.classList.remove("empty");
    scoreBar.style.width = dna.scoreWidth || "0%";
  }

  if (titles[0]) titles[0].textContent = dna.trigger || "--";
  if (titles[1]) titles[1].textContent = dna.intent || "--";
  if (archetype) archetype.textContent = dna.archetype || "--";

  if (descriptions[0]) descriptions[0].textContent = dna.description || "--";
  if (descriptions[1]) descriptions[1].textContent = dna.description || "--";
  if (descriptions[2]) descriptions[2].textContent = dna.colorDesc || "--";
  if (descriptions[3]) descriptions[3].textContent = dna.intentDesc || "--";
  if (descriptions[4]) descriptions[4].textContent = dna.eyeFlow || "--";
  if (descriptions[5]) descriptions[5].textContent = dna.mobileDesc || "Subject separation and contrast are estimated from the thumbnail brief.";

  if (mobileScore) mobileScore.textContent = dna.mobileScore || "-- / 10";
  if (swatchesWrap && Array.isArray(dna.swatches)) {
    swatchesWrap.innerHTML = dna.swatches.map(color => `
      <div class="dna-swatch" style="background:${color}"></div>
    `).join("");
  }
}
