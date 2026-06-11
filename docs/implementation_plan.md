# Redesign Caption Studio UI and Fix Tenglish Support

## Goal Description

Revamp the Caption Studio front‑end to match the premium “Skybooker” glass‑morphism aesthetic, use the SF Display font, reposition the generate button, and ensure error messages appear at the top. Additionally, finalize the multi‑language support, especially the Tenglish workflow, by externalising the transliteration dictionary and wiring it into the backend.

## User Review Required

- **Design direction**: Confirm the glass‑morphism style (blur, semi‑transparent surfaces) and the usage of SF Display font.
- **Generate button placement**: You requested moving it to the left side of the footer – confirm if it should be left‑aligned within the unified footer or completely separate.
- **Error message location**: Ensure top‑of‑page placement and styling (red background, rounded corners).
- **Tenglish dictionary**: Currently a small JSON file; confirm if you want to expand it later or keep as‑is.

> [!IMPORTANT] Verify the colour palette aligns with the existing theme variables (e.g., `--accent`, `--surface2`).

## Open Questions

- Do you want a dark‑mode variant for the Caption Studio, or will the current light theme suffice?
- Should the language dropdown be integrated into the existing composer‑header or placed elsewhere?
- Any additional UI elements (e.g., tooltips, micro‑animations) you’d like to add?

## Proposed Changes

---
### Front‑end

#### [MODIFY] [caption-studio.html](file:///c:/Users/zenix/Desktop/Projectx/frontend/public/app/partials/caption-studio.html)
- Re‑structure markup to a single container with glass‑morphism background (`backdrop-filter: blur(12px)`).
- Insert `<select id="captionLanguage">` dropdown with options for all languages (including Tenglish) right after the file‑upload input.
- Relocate the generate button into the left side of the unified footer (`.composer-footer-unified`).
- Add an error banner element at the top of `.caption-studio-layout`.
- Use `<link href="https://fonts.googleapis.com/css2?family=SF+Display:wght@400;600;800&display=swap" rel="stylesheet">` and apply `font-family: 'SF Display', sans-serif;` globally.

#### [MODIFY] [caption-studio.css](file:///c:/Users/zenix/Desktop/Projectx/frontend/public/app/css/caption-studio.css)
- Introduce glass‑morphism styles: `background: rgba(255,255,255,0.12); backdrop-filter: blur(12px); border-radius: 20px;` for main panels.
- Update colour variables to use harmonious HSL palette (e.g., `--primary: hsl(220, 90%, 60%);`).
- Style the error banner with a subtle gradient and red accent.
- Adjust the generate button class to `.studio-generate-btn-left` with left‑alignment and matching hover animation.
- Add micro‑animations for mode‑switch buttons (`transform: scale(1.02)` on hover).

---
### Back‑end

#### [MODIFY] [caption.js](file:///c:/Users/zenix/Desktop/Projectx/backend/src/routes/caption.js)
- Ensure the incoming `language` field from the form is read and passed to the Whisper request.
- Load the Tenglish dictionary from `backend/data/tenglishDict.json` and perform a lookup/replace before returning the transcription when `lang === "tenglish"`.
- Return a structured JSON response that includes any validation errors; the front‑end will render them in the top error banner.

#### [NEW] [tenglishDict.json](file:///c:/Users/zenix/Desktop/Projectx/backend/data/tenglishDict.json)
- Already exists; no changes needed now, but keep it external for future expansion.

---
### Tests & Verification

- Manual UI testing on Windows Chrome/Edge to verify layout, glass effect, and button placement.
- Upload a short audio file, select "Tenglish", and confirm the output contains transliterated Telugu words (e.g., "aim chesthunnav").
- Trigger an error (e.g., missing audio) and verify the message appears at the top.

## Verification Plan

### Automated Tests
- Run `npm test` (if a test suite exists) after UI changes to ensure no regression on existing routes.

### Manual Verification
- Open `http://localhost:3000/caption-studio` and inspect the new design.
- Check responsiveness on mobile widths.
- Verify colour contrast meets WCAG AA.

---
