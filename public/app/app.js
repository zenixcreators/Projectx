async function analyze() {
  const input = document.getElementById("input").value;
  if (!input.trim()) return;
  
  const toneEl = document.getElementById("tone");
  const tone = toneEl ? toneEl.value : "Conversational";

  let data;
  try {
    const res = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, tone })
    });
    data = await res.json();
  } catch (e) {
    document.getElementById("right").innerHTML = `<div class="right-empty"><p style="color:#ff4d4d;">Network error. Is the server running?</p></div>`;
    return;
  }

  console.log("DATA:", data);

  const script = (data.scripts || [])[0] || {};

  // ── HOOKS ──
  const mainHook = script.hook || "";
  const altHooks = (script.alt_hooks || []).map(h => typeof h === "string" ? h : (h.text || ""));
  const allHooks = mainHook ? [mainHook, ...altHooks.filter(h => h !== mainHook)] : altHooks;

  document.getElementById("hooks").innerHTML = allHooks.length
    ? allHooks.map((text, i) => `
        <div class="hook-item ${i === 0 ? "best" : ""}">
          <div style="flex:1;">
            ${i === 0 ? `<div class="hook-best-tag">⚡ Best Hook</div>` : ""}
            <div class="hook-text">${text}</div>
          </div>
          <button class="hook-copy" onclick="copyText(this)" data-text="${text.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}">Copy</button>
        </div>`).join("")
    : `<div class="empty-state"><div>No hooks returned</div></div>`;

  // ── SCRIPT ──
  const fs = script.full_script || "";
  const hook    = ex(fs, "HOOK")    || script.hook    || "";
  const problem = ex(fs, "PROBLEM") || script.setup   || "";
  const shift   = ex(fs, "SHIFT")   || "";
  const value   = ex(fs, "VALUE")   || script.value   || "";
  const result  = ex(fs, "RESULT")  || "";
  const ending  = ex(fs, "ENDING")  || script.cta     || "";

  const sections = [
    { key: "hook",    label: "Hook",    time: "0–3s",   content: hook,    cls: "hook-content"   },
    { key: "problem", label: "Problem", time: "3–8s",   content: problem                         },
    { key: "shift",   label: "Shift",   time: "8–12s",  content: shift                           },
    { key: "value",   label: "Value",   time: "12–22s", content: value                           },
    { key: "result",  label: "Result",  time: "22–26s", content: result                          },
    { key: "ending",  label: "Ending",  time: "",       content: ending,  cls: "ending-content"  },
  ].filter(s => s.content);

  const copyable = [hook, problem, shift, value, result, ending].filter(Boolean).join("\n\n");
  const hasLabels = /\[HOOK\]/i.test(fs);

  document.getElementById("right").innerHTML = `
    <div class="script-card">

      <div class="script-header">
        <div class="script-header-left">
          <div class="script-header-icon">🎬</div>
          <div class="script-header-title">Your Script</div>
        </div>
        <div class="script-meta">
          ${script.word_count ? `<div class="meta-pill">${script.word_count}w</div>` : ""}
          ${script.virality_score ? `<div class="score-pill">★ ${script.virality_score}/10</div>` : ""}
        </div>
      </div>

      <div class="script-body">
        ${hasLabels && sections.length
          ? sections.map(s => `
              <div class="section-block">
                <div class="section-row">
                  <div class="section-name">${s.label}</div>
                  ${s.time ? `<div class="section-time">${s.time}</div>` : ""}
                </div>
                <div class="section-content ${s.cls || ""}">${s.content}</div>
              </div>`).join("")
          : `<div class="section-content" style="white-space:pre-wrap;">${fs || "Script could not be parsed."}</div>`
        }
      </div>

      <div class="script-footer">
        ${script.virality_reason ? `
          <div class="meta-row">
            <span class="meta-icon">💡</span>
            <span><strong>Why it works:</strong> ${script.virality_reason}</span>
          </div>` : ""}
        ${script.delivery_notes ? `
          <div class="meta-row">
            <span class="meta-icon">🎙</span>
            <span><strong>Delivery:</strong> ${script.delivery_notes}</span>
          </div>` : ""}
        ${(script.hashtags || []).length ? `
          <div class="meta-row" style="flex-direction:column;gap:8px;">
            <span style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);">Hashtags</span>
            <div class="hashtags">${script.hashtags.map(h => `<span class="hashtag">${h}</span>`).join("")}</div>
          </div>` : ""}
        <button class="copy-btn" onclick="copyText(this)" data-text="${copyable.replace(/"/g,'&quot;').replace(/\n/g,'&#10;')}">
          📋 Copy Full Script
        </button>
      </div>

    </div>`;
}

function ex(fs, label) {
  if (!fs) return "";
  const m = fs.match(new RegExp(`\\[${label}\\]([\\s\\S]*?)(?=\\[|$)`, "i"));
  return m ? m[1].replace(/^\s*\.\.\.\s*$/gm, "").trim() : "";
}

function copyText(btn) {
  const text = btn.getAttribute("data-text");
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy");
    document.body.removeChild(ta);
  });
  const orig = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => btn.textContent = orig, 2000);
}