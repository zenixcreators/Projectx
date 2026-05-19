# 🌌 Aurora — Nexus Creator Studio
> The Elite AI-Powered Workspace & Competitor Intelligence Suite for Modern Digital Creators.

Aurora is a state-of-the-art, full-stack creator suite engineered specifically to help digital video creators, vloggers, and growth marketers script, translate, analyze, and outperform their competition. Combining a matte-ivory glass-morphic SPA shell, lightning-fast Llama-3 AI strategy crunching, and dedicated video intelligence pipelines, Aurora turns raw competitor data into actionable, high-growth playbooks.

---

## 🎨 Core Creator Studios & Features

### 1. 📊 Channel & Competitor Analysis Command Center
* **Unified Platform Scouter**: A single, prestigious competitive dashboard supporting **YouTube** channels and **Instagram** Reels competitor profiles with a tactile pill selector.
* **Tacile Notebook Checklists**: AI-generated title hook guides and thumbnail guidelines are parsed and presented as interactive checklists featuring brand-purple checks (`fa-circle-check`) and visual drafting guides (`fa-compass-drafting`).
* **Niche Battle Map**: A competitive moats dashboard outlining high-value content gaps (topics competitors have *never* posted about) and dynamic combat directives on how to outpace them.
* **Rounded Metric Engines**: Displays high-fidelity compact stats: Followers/Subscribers, Reels Plays/Views, Upload Schedules, and Single-Digit Upload Frequencies.
* **Earnings Predictor**: Real-time monthly and annual creator sponsorship and ad revenue estimates calculated using adaptive CPM models.

### 2. 📝 Script Studio
* **Hook Engineering Matrix**: Advanced script synthesizer focusing on hook psychology and structured storyboarding frameworks: `[PROBLEM] ➔ [SHIFT] ➔ [VALUE]`.
* **Audience Tone Adjusters**: Toggles scripts between distinct editorial tones (educational, high-energy, narrative) to fit any creator persona.

### 3. ⚡ Hook Studio
* **Viral Title Generator**: Brainstorms psychological curiosity-gap titles, custom engagement triggers, and thumb-stopping visual descriptions instantly.

### 4. 💬 Caption Studio
* **Multi-Language Caption localized engine**: Translates and synchronizes captions into multiple native target languages, combining local slang with clean structural formats.
* **Multi-Format Downloader**: Supports SRT, TXT, and ASS exports with clean, non-overlapping action buttons.

### 5. 🖼️ Thumbnail Studio (Gemini Engine)
* **Single-Provider Intelligence**: Fully routed to the advanced **Google Gemini/Nano Banana** cognitive engine for thumbnail analysis.
* **Visual DNA Analysis**: Breaks down visual elements, lighting grids, contrast focal points, and attention heatmap scoring to ensure maximum CTR.

---

## 🏗️ Repository Architecture & Directory Map

The project is structured as a modular, high-performance MVC application featuring a unified Express backend, mongoose databases, and a lightweight, zero-dependency frontend SPA shell.

```
project/
├── backend/
│   ├── models/            # Mongoose MongoDB Data Schemas
│   │   ├── User.js        # Accounts, email, pass hashes, and Google sub ID
│   │   └── ChannelReport.js# Competitor scan cache & growth metadata
│   ├── middleware/        # Express Request Hooks
│   │   └── auth.js        # JWT HTTP-Only Cookies validator
│   ├── routes/            # Express API Endpoints
│   │   ├── auth.js        # Register, login, cookies, Google Identity SSO
│   │   └── channelAnalysis.js# SSE streaming and cached report queries
│   └── services/          # Full-Stack Business Logic
│       ├── channelAnalysisService.js# Groq Llama-3 compiler & IG scouter
│       ├── youtubeService.js        # Native YouTube scraping service
│       └── channelMetricsService.js # View velocity & revenue logic
├── prompts/               # System prompt vaults for AI pipeline
├── public/                # Static SPA Client Assets
│   ├── index.html         # High-conversion Landing page
│   └── app/               # The Core Studio Workspace Shell
│       ├── app.css        # Core design system tokens (matte ivory theme)
│       ├── index.html     # SPA Workspace Container
│       ├── css/           # Studio-specific stylesheets
│       │   ├── shared.css # Global scrollbars, sidebar, and animations
│       │   └── channel-analysis.css# Tactical notebook checklists
│       ├── js/            # Client Controllers (Pure Vanilla ES6+)
│       │   ├── shared.js  # SwitchView and smooth top-scroll transitions
│       │   ├── partials.js# Lightweight dynamic HTML templates loader
│       │   └── channel-analysis.js# Dynamic metrics & platform toggles
│       └── partials/      # Modular HTML dashboard panels
│           └── channel-analysis.html# Swapper tab pills & metrics grids
├── server.js              # Application entry point (Express, SSE, MongoDB)
├── .env                   # Protected credential registry (GROQ, GEMINI, MONGO)
└── package.json           # Project dependencies and workspace scripts
```

---

## 🔒 Full-Stack Security & Database Infrastructure

* **Session Security**: Uses robust **JWT (JSON Web Tokens)** stored inside secure, client-inaccessible **httpOnly cookies**, preventing cross-site scripting (XSS) token theft.
* **Password Encryption**: All native logins utilize **bcryptjs** password salting and hashing.
* **Google SSO**: Connected to Google Identity Services OAuth redirection pipelines for single-click authentication.
* **Database Cache**: Integrates a scalable **MongoDB** database managed via **Mongoose**. All competitive reports are cached locally in MongoDB, allowing for instantaneous reports loading while safeguarding external scraper limits.
* **Robust Fallbacks**: Integrates server-sent event (SSE) recovery routes and database fallbacks, allowing the app to run seamlessly even when offline.

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
MONGO_URI=mongodb://127.0.0.1:27017/aurora-creators
JWT_SECRET=your_super_secret_jwt_key
GROQ_API_KEY=your_groq_llama3_api_key
GEMINI_API_KEY=your_google_gemini_api_key
```

### 4. Running the Workspace
To start the server in development mode:
```bash
npm start
```
Open **`http://localhost:3000`** in your browser. Log in or click Register to open the premium workspace!

---

## 💎 Design Language: The Matte Ivory System
Aurora utilizes a curated, state-of-the-art designer interface:
* **Backgrounds & Surfaces**: Clean ivory canvases (`#fcfbf8`) styled with soft matte-shadows and thin light-gray borders (`rgba(20,20,25, 0.06)`).
* **Smooth Navigation Swappings**: Clicking sidebar links dynamically swaps DOM partials, triggers fade/slide transformations (`viewIn 260ms var(--ease)`), and scrolls the content smoothly back to the top of the viewport for a seamless user experience.
