/**
 * Main App Dashboard Logic
 * Handles user profile display, view switching, and AI analysis
 */

// --- Global State ---
let currentUser = null;

/**
 * Initializes the dashboard by fetching user data
 */
async function loadCurrentUser() {
    const user = await window.Auth?.check();
    if (!user) return; // Auth.js handles redirection if missing

    currentUser = user;
    
    // Update UI elements
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) userNameEl.textContent = user.name || user.email;
    if (userAvatarEl) {
        if (user.avatar) {
            userAvatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            userAvatarEl.textContent = (user.firstName || user.name || 'U').charAt(0).toUpperCase();
        }
    }

    // Reveal app container
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.opacity = '1';
        appContainer.style.visibility = 'visible';
    }
}

/**
 * AI Analysis logic (Script Generation, etc.)
 */
async function analyze() {
    const input = document.getElementById("input")?.value || document.getElementById("mainInput")?.value;
    if (!input || !input.trim()) return;
    
    const toneEl = document.getElementById("tone");
    const tone = toneEl ? toneEl.value : (window.activeTone || "Conversational");

    let data;
    try {
        const res = await fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, tone })
        });
        
        if (!res.ok) {
            if (res.status === 401) return window.Auth.logout();
            throw new Error('Analysis failed');
        }
        
        data = await res.json();
    } catch (e) {
        console.error("Analysis Error:", e);
        const scriptTesterResult = document.getElementById("scriptTesterResult");
        if (scriptTesterResult) {
            scriptTesterResult.innerHTML = `<div class="hook-test-error">Could not generate this script. Please try again.</div>`;
        }
        return;
    }

    console.log("DATA RECEIVED:", data);
    
    const script = (data.scripts || [])[0] || data || {};
    
    // ── SCRIPT SECTIONS ──
    const sections = script.sections || {
        hook: script.hook || "",
        problem: script.problem || script.setup || "",
        shift: script.shift || "",
        value: script.value || "",
        result: script.result || "",
        ending: script.ending || script.cta || ""
    };

    // ── HOOKS LOGIC ──
    // Get all hooks and clean them up
    let rawHooks = script.hooks || script.alt_hooks || [];
    let allHooks = rawHooks.map(h => typeof h === "string" ? h : (h.text || h.hook || ""));

    // Ensure the "best" hook from the script is in the list
    const bestHook = sections.hook;
    if (bestHook && !allHooks.includes(bestHook)) {
        allHooks.unshift(bestHook); // Add it to the top if missing
    }
    
    // Limit to exactly 5 if needed (user requested exactly 5)
    allHooks = allHooks.slice(0, 5);

    // Call the global render function
    if (typeof window.renderScriptResult === "function") {
        window.renderScriptResult({
            sections: sections,
            hooks: allHooks,
            bestHook: bestHook, // Explicitly pass the best hook
            wordCount: script.wordCount || script.word_count,
            duration: script.duration,
            hashtags: script.hashtags || [],
            virality_score: script.virality_score,
            virality_reason: script.virality_reason
        });
    }
}

/**
 * Utility to copy text to clipboard
 */
function copyText(btn) {
    const text = btn.getAttribute("data-text");
    navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = orig, 2000);
    }).catch(err => {
        console.error('Copy failed', err);
    });
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
    loadCurrentUser();
});
