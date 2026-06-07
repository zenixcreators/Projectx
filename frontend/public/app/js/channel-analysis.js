/**
 * Aurora — Channel & Competitor Analysis Controller
 * Single Page Application logic in vanilla JS
 */

const stepsKeys = ["resolving", "fetching", "details", "calculating", "generating"];

let activePlatform = "youtube";

function setAnalysisPlatform(platform) {
  activePlatform = platform;
  document.querySelectorAll('.platform-pill').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`platform-btn-${platform}`);
  if (activeBtn) activeBtn.classList.add('active');

  const urlInput = document.getElementById("channelUrlInput");
  if (urlInput) {
    if (platform === "instagram") {
      urlInput.placeholder = "e.g. @therock or https://www.instagram.com/p/...";
    } else {
      urlInput.placeholder = "e.g. @MrBeast or https://www.youtube.com/channel/UC...";
    }
  }
}

/**
 * Switch report sections via tabs
 */
function switchReportTab(btnEl, tabId) {
  const parent = btnEl.parentElement;
  if (parent) {
    parent.querySelectorAll(".report-tab-btn").forEach(btn => btn.classList.remove("active"));
  }
  btnEl.classList.add("active");

  const resultContainer = document.getElementById("auditReportResult");
  if (resultContainer) {
    resultContainer.querySelectorAll(".report-tab-content").forEach(tab => tab.classList.remove("active"));
  }

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add("active");
  }
}

// Format large numbers (e.g., 1250000 -> 1.25M)
function formatCompactNumber(num) {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}

// Scans history registry removed for workspace clarity

/**
 * Restores a cached scan from MongoDB
 */
async function fetchAndDisplayCachedReport(channelId) {
  const resultContainer = document.getElementById("auditReportResult");
  const errorAlert = document.getElementById("analysisErrorAlert");

  try {
    if (errorAlert) errorAlert.style.display = "none";
    const skeleton = document.getElementById("reportSkeleton");
    if (skeleton) skeleton.style.display = "none";

    const res = await fetch(`/api/channel/report/${channelId}`);
    if (!res.ok) throw new Error("Could not find this report on the server.");

    const report = await res.json();
    displayReport(report);

    // Scroll down to the report smoothly
    resultContainer.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.error(err);
    window.showToast("Analysis Load Failed", err.message, "error");
    if (errorAlert) {
      errorAlert.style.display = "block";
      document.getElementById("analysisErrorMsg").textContent = window.getFriendlyErrorMessage(err.message);
    }
  }
}

/**
 * Updates step indicator pills in progress block
 */
function updateStepper(activeStepKey, labelText) {
  const stepperStatus = document.getElementById("stepperStatusMsg");
  if (stepperStatus) stepperStatus.textContent = labelText;

  const activeIdx = stepsKeys.indexOf(activeStepKey);
  if (activeIdx === -1) return;

  stepsKeys.forEach((key, idx) => {
    const pill = document.getElementById(`step-${key}`);
    if (!pill) return;

    pill.className = "step-pill"; // reset
    if (idx < activeIdx) {
      pill.classList.add("completed");
    } else if (idx === activeIdx) {
      pill.classList.add("active");
    }
  });
}

/**
 * Triggers and streams the real-time POST SSE scan pipeline
 */
async function runChannelAudit() {
  const urlInput = document.getElementById("channelUrlInput");
  const btnRun = document.getElementById("btnRunAudit");
  const stepper = document.getElementById("analysisStepper");
  const errorAlert = document.getElementById("analysisErrorAlert");
  const resultContainer = document.getElementById("auditReportResult");

  if (!urlInput || !btnRun) return;

  const url = urlInput.value.trim();
  if (!url) {
    if (errorAlert) {
      errorAlert.style.display = "block";
      document.getElementById("analysisErrorMsg").textContent = "Please enter a valid YouTube channel URL or @handle.";
    }
    return;
  }

  // UI Resets
  if (errorAlert) errorAlert.style.display = "none";
  if (resultContainer) resultContainer.style.display = "none";
  if (stepper) stepper.style.display = "block";
  const skeleton = document.getElementById("reportSkeleton");
  if (skeleton) skeleton.style.display = "block";
  btnRun.disabled = true;
  btnRun.innerHTML = `<span class="fa-solid fa-spinner animate-spin"></span> Crawling YouTube...`;

  // Reset stepper steps
  stepsKeys.forEach(key => {
    const pill = document.getElementById(`step-${key}`);
    if (pill) pill.className = "step-pill";
  });

  try {
    const response = await fetch("/api/channel/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url, platform: activePlatform })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || "Server failed to launch scanner.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.startsWith("data: ")) {
          const dataStr = cleanLine.substring(6).trim();
          if (!dataStr) continue;

          const parsed = JSON.parse(dataStr);
          if (parsed.type === "progress") {
            updateStepper(parsed.step, parsed.label);
          } else if (parsed.type === "done") {
            if (stepper) stepper.style.display = "none";
            const skeleton = document.getElementById("reportSkeleton");
            if (skeleton) skeleton.style.display = "none";
            displayReport(parsed.report);
            break;
          } else if (parsed.type === "error") {
            throw new Error(parsed.message);
          }
        }
      }
    }

  } catch (err) {
    console.error("Pipeline failure:", err);
    window.showToast("Analysis Scan Failed", err.message || "Scavenging failed. Verify link and network.", "error");
    if (errorAlert) {
      errorAlert.style.display = "block";
      document.getElementById("analysisErrorMsg").textContent = window.getFriendlyErrorMessage(err.message || "Scavenging failed. Verify link and network.");
    }
    if (stepper) stepper.style.display = "none";
    const skeleton = document.getElementById("reportSkeleton");
    if (skeleton) skeleton.style.display = "none";
  } finally {
    btnRun.disabled = false;
    btnRun.innerHTML = `<i class="fa-solid fa-bolt"></i> Run AI Analysis`;
  }
}

/**
 * Maps calculated stats and synthesized AI blocks to layout IDs
 */
function displayReport(report) {
  const resultContainer = document.getElementById("auditReportResult");
  if (!resultContainer) return;

  // Reset active tab to performance on load
  const tabsContainer = document.querySelector(".report-tabs");
  if (tabsContainer) {
    const firstBtn = tabsContainer.querySelector(".report-tab-btn");
    if (firstBtn) {
      switchReportTab(firstBtn, "tab-performance");
    }
  }

  // Hero Card
  document.getElementById("rptAvatar").src = report.thumbnailUrl || "https://via.placeholder.com/150";
  document.getElementById("rptName").textContent = report.channelName;
  document.getElementById("rptNiche").textContent = `Niche: ${report.niche}`;
  
  const specVal = report.nicheSpecificity || "Medium";
  document.getElementById("txtSpecificity").textContent = specVal;
  const specBar = document.getElementById("barSpecificity");
  if (specBar) {
    let width = "50%";
    if (specVal === "Very High") width = "95%";
    else if (specVal === "High") width = "75%";
    else if (specVal === "Low") width = "25%";
    specBar.style.width = width;
  }
  
  const growthBadge = document.getElementById("rptGrowth");
  growthBadge.textContent = report.growthPhase;
  growthBadge.className = "badge";
  if (report.growthPhase === "exploding") growthBadge.classList.add("text-rose-500", "bg-rose-500/10", "border-rose-500/20");
  else if (report.growthPhase === "growing") growthBadge.classList.add("text-green", "bg-green-bg", "border-green/20");
  else growthBadge.classList.add("text-blue", "bg-blue-bg", "border-blue/20");

  const isInstagram = report.channelId && report.channelId.startsWith("ig_");

  // Dynamic Platform Labels
  document.getElementById("lblSubs").textContent = isInstagram ? "Followers" : "Subscribers";
  document.getElementById("lblViews").textContent = isInstagram ? "Reels Plays" : "Total Views";
  document.getElementById("lblAvgViews").textContent = isInstagram ? "Avg Reels Plays" : "Avg Views / Video";
  document.getElementById("lblSchedule").textContent = isInstagram ? "Posting Schedule" : "Upload Schedule";
  document.getElementById("lblFrequency").textContent = isInstagram ? "Reels Per Week" : "Uploads Per Week";
  document.getElementById("lblDuration").textContent = isInstagram ? "Avg Reels Duration" : "Avg Video Duration";
  document.getElementById("lblBestLength").textContent = isInstagram ? "Best Reels Length" : "Best Video Length";
  document.getElementById("lblMonthlyRev").textContent = isInstagram ? "Est. Monthly Sponsorships" : "Est. Monthly Ad Revenue";
  document.getElementById("lblYearlyRev").textContent = isInstagram ? "Est. Annual Sponsorships" : "Est. Annual Ad Revenue";

  document.getElementById("rptHealth").textContent = report.healthScore;
  document.getElementById("rptVelocity").textContent = report.metrics.viewVelocity + "x";
  document.getElementById("rptSummary").textContent = report.summary;

  // Stats Grid 1
  document.getElementById("statSubs").textContent = formatCompactNumber(report.stats.subscribers);
  document.getElementById("statViews").textContent = formatCompactNumber(report.stats.totalViews);
  document.getElementById("statAvgViews").textContent = formatCompactNumber(report.metrics.avgViewsPerVideo);
  document.getElementById("statER").textContent = report.metrics.avgEngagementRate + "%";

  // Stats Grid 2
  document.getElementById("statSchedule").textContent = report.metrics.uploadSchedule;
  document.getElementById("statFrequency").textContent = Math.round(report.metrics.uploadsPerWeek || 0) + " / wk";
  document.getElementById("statDuration").textContent = report.metrics.avgVideoDurationMinutes + "m";
  document.getElementById("statBestLength").textContent = report.metrics.bestPerformingLength;

  // Revenue Estimations
  const minM = report.metrics.estMinMonthlyRevenue || 0;
  const maxM = report.metrics.estMaxMonthlyRevenue || 0;
  document.getElementById("statMonthlyRev").textContent = `$${formatCompactNumber(minM)} - $${formatCompactNumber(maxM)}`;
  document.getElementById("statYearlyRev").textContent = `$${formatCompactNumber(minM * 12)} - $${formatCompactNumber(maxM * 12)}`;

  // Content DNA
  const topicsContainer = document.getElementById("rptTopics");
  topicsContainer.innerHTML = report.contentDNA.dominantTopics.map(topic => `
    <span class="dna-chip">${topic}</span>
  `).join("");

  document.getElementById("rptTitlePatterns").textContent = report.contentDNA.titlePatterns;

  // Audience
  const ratingEl = document.getElementById("rptRating");
  const rateVal = report.engagementQuality?.rating || "Average";
  ratingEl.textContent = rateVal;
  if (rateVal === "Excellent" || rateVal === "Strong") {
    ratingEl.style.color = "var(--green)";
  } else {
    ratingEl.style.color = "var(--amber)";
  }
  
  const engageBar = document.getElementById("barEngagement");
  if (engageBar) {
    let width = "50%";
    engageBar.className = "progress-bar-fill"; // reset
    if (rateVal === "Excellent") { width = "95%"; engageBar.classList.add("fill-green"); }
    else if (rateVal === "Strong") { width = "75%"; engageBar.classList.add("fill-green"); }
    else if (rateVal === "Average") { width = "50%"; engageBar.classList.add("fill-amber"); }
    else if (rateVal === "Weak") { width = "25%"; engageBar.classList.add("fill-red"); }
    engageBar.style.width = width;
  }
  
  document.getElementById("rptBenchmark").textContent = report.engagementQuality.benchmark;
  document.getElementById("rptEngagementNotes").textContent = report.engagementQuality.notes;

  // Competitor Threat
  const threatBadge = document.getElementById("rptThreatBadge");
  const threatVal = report.competitorThreatLevel || "Medium";
  threatBadge.textContent = threatVal;
  threatBadge.className = "badge";
  if (threatVal === "High") {
    threatBadge.classList.add("text-rose-500", "bg-rose-500/10", "border-rose-500/20");
  } else if (threatVal === "Medium") {
    threatBadge.classList.add("text-amber-500", "bg-amber-500/10", "border-amber-500/20");
  } else {
    threatBadge.classList.add("text-green", "bg-green-bg", "border-green/20");
  }

  const threatBar = document.getElementById("barThreat");
  if (threatBar) {
    let width = "50%";
    threatBar.className = "progress-bar-fill"; // reset
    if (threatVal === "High") { width = "85%"; threatBar.classList.add("fill-red"); }
    else if (threatVal === "Medium") { width = "50%"; threatBar.classList.add("fill-amber"); }
    else if (threatVal === "Low") { width = "20%"; threatBar.classList.add("fill-green"); }
    threatBar.style.width = width;
  }

  document.getElementById("rptThreatReasoning").textContent = report.threatReasoning;

  // Content Gaps List
  document.getElementById("rptGaps").innerHTML = report.contentGaps.map(gap => `
    <li>${gap}</li>
  `).join("");

  // Recommendations Action Plan
  document.getElementById("rptRecommendations").innerHTML = report.recommendations.map(rec => {
    const borderClass = rec.priority === "High" ? "high" : rec.priority === "Medium" ? "medium" : "";
    const priorityColor = rec.priority === "High" ? "var(--red)" : rec.priority === "Medium" ? "var(--amber)" : "var(--accent)";

    return `
      <div class="rec-item ${borderClass}">
        <div class="rec-header">
          <span class="rec-action">${rec.action}</span>
          <span class="badge" style="color: ${priorityColor}; background: rgba(255,255,255,0.02); font-size: 8px; padding: 1px 6px;">${rec.priority}</span>
        </div>
        <div class="rec-why">${rec.why}</div>
      </div>
    `;
  }).join("");

  // Hook Strategies (Lined Notebook format)
  const hookLines = (report.hookStrategy || "").split("\n").filter(l => l.trim().length > 0);
  document.getElementById("rptHookStrategy").innerHTML = hookLines.map(line => `
    <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; font-size: 13.5px;">
      <span style="color: var(--accent); font-size: 15px; margin-top: 1px;"><i class="fa-solid fa-circle-check"></i></span>
      <span style="color: var(--text-sec); line-height: 1.45;">${line.replace(/^[•\-\*\s]+/, "")}</span>
    </div>
  `).join("") || `<div style="color:var(--muted);font-style:italic;">No hook formulas registered.</div>`;

  // Thumbnail Strategy
  const thumbLines = (report.thumbnailStrategy || "").split("\n").filter(l => l.trim().length > 0);
  document.getElementById("rptThumbnailStrategy").innerHTML = thumbLines.map(line => `
    <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; font-size: 13.5px;">
      <span style="color: var(--green); font-size: 15px; margin-top: 1px;"><i class="fa-solid fa-compass-drafting"></i></span>
      <span style="color: var(--text-sec); line-height: 1.45;">${line.replace(/^[•\-\*\s]+/, "")}</span>
    </div>
  `).join("") || `<div style="color:var(--muted);font-style:italic;">No thumbnail rules registered.</div>`;

  // Conquest Battle Directive
  if (report.recommendations && report.recommendations.length > 0) {
    document.getElementById("rptConquestRule").textContent = `Focus on this direct action item: "${report.recommendations[0].action}" because ${report.recommendations[0].why}`;
  } else {
    document.getElementById("rptConquestRule").textContent = "Focus on content schedule pacing and title structures to outperform this niche benchmark.";
  }

  // Videos Table
  const topVideosList = report.topVideos || (report.metrics && report.metrics.topVideos) || [];
  document.getElementById("rptTopVideosBody").innerHTML = topVideosList.map(vid => `
    <tr>
      <td style="display: flex; align-items: center; gap: 10px; min-width: 250px;">
        <img src="${vid.thumbnailUrl || 'https://via.placeholder.com/150'}" alt="${vid.title}" style="width: 56px; height: 32px; border-radius: 4px; object-fit: cover;">
        <div style="min-width: 0; flex: 1;">
          <div style="font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${vid.title}</div>
          <span style="font-size: 10px; color: var(--muted);">${new Date(vid.publishedAt).toLocaleDateString()}</span>
        </div>
      </td>
      <td style="text-align: right; font-weight: 600; font-family: var(--font-mono);">${formatCompactNumber(vid.views)}</td>
      <td style="text-align: right; font-family: var(--font-mono);">${formatCompactNumber(vid.likes)}</td>
      <td style="text-align: right; font-family: var(--font-mono);">${formatCompactNumber(vid.comments)}</td>
      <td style="text-align: center;">
        <a href="${vid.url}" target="_blank" class="btn-watch">Watch ↗</a>
      </td>
    </tr>
  `).join("");

  // Reveal Report Container
  resultContainer.style.display = "block";
}

// Attach listener to wait for partial dynamic load E2E
document.addEventListener("creo:partials-loaded", () => {
  // Creator command center ready
});
