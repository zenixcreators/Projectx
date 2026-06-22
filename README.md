# 🌌 Creo Studio
> The Elite AI-Powered Workspace & Competitor Intelligence Suite for Modern Digital Creators.

Creo Studio is a state-of-the-art, full-stack creator suite engineered specifically to help digital video creators, vloggers, and growth marketers script, translate, analyze, and outperform their competition. Combining a matte-ivory glass-morphic SPA shell, lightning-fast cognitive APIs, and dedicated video intelligence pipelines, Creo Studio turns raw competitor data and thumbnails into actionable, high-growth playbooks.

---

## 🎨 Core Creator Studios & Features

### 1. 📊 Channel & Competitor Analysis Command Center
* **Unified Platform Scouter**: A single, prestigious competitive dashboard supporting **YouTube** channels with a tactile selector. Includes SSE-streaming progress parsing.
* **Tactile Notebook Checklists**: AI-generated title hook guides and thumbnail guidelines are parsed and presented as interactive checklists featuring brand-purple checks (`fa-circle-check`) and visual drafting guides (`fa-compass-drafting`).
* **Niche Battle Map**: A competitive moats dashboard outlining high-value content gaps (topics competitors have *never* posted about) and dynamic combat directives on how to outpace them.
* **Rounded Metric Engines**: Displays high-fidelity compact stats: Followers/Subscribers, Upload Schedules, and Single-Digit Upload Frequencies.
* **Earnings Predictor**: Real-time monthly and annual creator sponsorship and ad revenue estimates calculated using adaptive CPM models.

### 2. 📝 Script Studio
* **Hook Engineering Matrix**: Advanced script synthesizer focusing on hook psychology and structured storyboarding frameworks: `[PROBLEM] ➔ [SHIFT] ➔ [VALUE]`.
* **Audience Tone Adjusters**: Toggles scripts between distinct editorial tones (educational, high-energy, narrative) to fit any creator persona.

### 3. ⚡ Hook Studio
* **Viral Title Generator**: Brainstorms psychological curiosity-gap titles, custom engagement triggers, and thumb-stopping visual descriptions instantly.

### 4. 💬 Caption Studio (Multi-Language & Transliteration)
* **Localised Transcription Engine**: Transcribes and localizes captions into multiple native target languages, combining local slang with clean structural formats.
* **Tenglish Transliteration Support**: Features a custom Latin-script transliteration workflow for Telugu audio/scripts, reading mappings from an externalized dictionary (`tenglishDict.json`).
* **Multi-Format Downloader**: Supports SRT, TXT, and ASS exports with clean, non-overlapping action buttons.

### 5. 🖼️ Thumbnail Studio (Vision Audit)
* **Groq Vision Intelligence**: Powered by the advanced **meta-llama/llama-4-scout-17b-16e-instruct** cognitive engine for thumbnail analysis.
* **Visual DNA Analysis**: Breaks down visual elements, lighting grids, contrast focal points, and attention heatmap scoring to ensure maximum CTR.
* **Flexible Input Methods**: Audits uploaded image files, extracts frame snapshots from uploaded videos, or pulls high-fidelity thumbnails directly from a YouTube URL.
* **Platform-Specific Copyable Prompts**: Generates reconstruction prompts in plain text/JSON and copyable prompts tailored for Midjourney, DALL-E 3, Flux, and Ideogram.
* **Style Variants**: Produces three adjacent variations (Color shift, Minimal, and High energy version) to help refine designs.

### 6. 🔒 Admin Dashboard Portal
* **Consolidated Metrics Dashboard**: Served at `/admin`, displaying total registered creators, paid/free user distribution, active trials, MTD revenue, and IP registration metrics.
* **Creator Directory Directory**: Allows administrators to manage creator profiles, subscription plans, roles (user/admin), and trial parameters (start, extend, expire, clear).
* **Multi-Registration Security Alerting**: Flags shared IP addresses dynamically to monitor suspicious multi-registration activities.

---

## 🏗️ Repository Architecture & Directory Map

The project is structured as a modular, high-performance MVC application featuring a unified Express backend, mongoose databases, and a lightweight, zero-dependency frontend SPA shell.

```
project/
├── admin/                 # Admin workspace portal
│   ├── public/            # Admin SPA client assets
│   │   ├── css/           # Admin stylesheet files
│   │   ├── index.html     # Admin main metrics panel (formerly admin.html)
│   │   ├── js/            # Client admin controller logic
│   │   ├── login.html     # Admin login interface (formerly admin-login.html)
│   │   └── vendor/        # Third-party assets (Chart.js, etc.)
│   └── package.json       # Admin sub-package configuration
├── backend/               # Server-side workspace folder
│   ├── data/              # Static dictionaries and models
│   │   └── tenglishDict.json # Transliteration map for Telugu-English words
│   ├── server.js          # Core Express server entry point
│   ├── package.json       # Backend server dependencies & configurations
│   └── src/               # Server application source layers
│       ├── ai/            # Core AI engines config and integrations
│       ├── config/        # Environment configurations & database setup
│       ├── controllers/   # Request/Response routing controls
│       ├── middleware/    # Auth (JWT checking) & rate-limiting middlewares
│       ├── models/        # Mongoose data schemas (User.js, ChannelReport.js, etc.)
│       ├── routes/        # Router endpoints (auth.js, thumbnailAnalysis.js, script.js, etc.)
│       ├── services/      # Business logic providers (channelAnalysisService.js, youtubeService.js)
│       └── uploads/       # Storage target for user avatar uploads
├── docs/                  # Documentation vaults & checklists
│   ├── implementation_plan.md # Development architectures & milestones
│   ├── task.md            # Live development checkpoints
│   └── walkthrough.md     # Verification logs & summaries
├── frontend/              # Frontend workspace portal
│   └── public/            # Static high-conversion landing page & app assets
│       ├── app/           # Core creator workspace SPA shell (matte ivory design)
│       │   ├── app.css    # Core design theme styles
│       │   ├── css/       # Studio CSS modules (thumbnail-studio.css, shared.css, etc.)
│       │   ├── index.html # App workspace entry page
│       │   ├── js/        # App client controllers (thumbnail-studio.js, script-studio.js, etc.)
│       │   └── partials/  # Modular HTML dashboard tabs (thumbnail-studio.html, billing.html)
│       ├── index.html     # Brand landing page (landing)
│       ├── login.html     # Account login page
│       ├── signup.html    # Account registration page
│       └── auth.js        # Google SSO & session cookie management
├── scripts/               # Developer automation scripts
│   ├── seed-admin.js      # Creates/Upgrades an administrative account
│   └── validate-vision-audit.js # Automated vision-audit integration test suite
├── docker-compose.yml     # Containerized service configuration
├── .env                   # Configuration registry for secrets & APIs (local, not committed)
└── package.json           # Root package script registry (orchestrates workspaces)
```

---

## 🔒 Full-Stack Security & Database Infrastructure

* **Session Security**: Uses robust **JWT (JSON Web Tokens)** stored inside secure, client-inaccessible **httpOnly cookies**, preventing cross-site scripting (XSS) token theft.
* **Password Encryption**: All native logins utilize **bcryptjs** password salting and hashing.
* **Google SSO**: Connected to Google Identity Services OAuth redirection pipelines for single-click authentication.
* **Database Cache**: Integrates a scalable **MongoDB** database managed via **Mongoose**. All competitive reports are cached locally in MongoDB, allowing for instantaneous reports loading while safeguarding external scraper limits.
* **Developer OTP Console Logging**: Includes an OTP dev mode where verification codes are logged directly to standard out (`[AUTH OTP DEV MODE]`) when SMTP credentials are not configured, facilitating offline test automation.

---

## 🛠️ Installation & Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v16+) and a running instance of [MongoDB](https://www.mongodb.com/) (local or MongoDB Atlas).

### 2. Clone and Setup Dependencies
Initialize standard dependencies in the root workspace folder:
```bash
npm install
```

### 3. Environment Variables Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/creo
GROQ_API_KEY=your_groq_api_key
YOUTUBE_API_KEY=your_youtube_api_key
SESSION_SECRET=your_jwt_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_FROM="Creo <your_smtp_user>"
```

### 4. Seed Admin Credentials
To create or upgrade an administrative user account:
```bash
node scripts/seed-admin.js
```

### 5. Running the Workspace
To start the server in development mode:
```bash
npm start
# or
npm run dev
```
Open **`http://localhost:3000`** in your browser. Log in or click Register to open the premium workspace!
Admin portal can be accessed at **`http://localhost:3000/admin`**.

### 6. Running Integration Tests
To run the automated E2E vision audit integration test suite:
```bash
node scripts/validate-vision-audit.js
```

---

## 💎 Design Language: The Matte Ivory System
Creo Studio utilizes a curated, state-of-the-art designer interface:
* **Backgrounds & Surfaces**: Clean ivory canvases (`#fcfbf8`) styled with soft matte-shadows and thin light-gray borders (`rgba(20,20,25, 0.06)`).
* **Smooth Navigation Swappings**: Clicking sidebar links dynamically swaps DOM partials, triggers fade/slide transformations (`viewIn 260ms var(--ease)`), and scrolls the content smoothly back to the top of the viewport for a seamless user experience.
