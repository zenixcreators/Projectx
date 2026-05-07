# Nexus Creator Studio 🚀

**Nexus Creator Studio** is a high-fidelity, AI-powered SaaS dashboard built specifically for content creators. It bridges the gap between raw ideas and ready-to-publish content by providing state-of-the-art script generation and automated, multi-language captioning.

---

## 📑 Table of Contents
1. [Core Features](#-core-features)
2. [Frontend Architecture (UI)](#-frontend-architecture-ui)
3. [Backend Architecture](#-backend-architecture)
4. [API Endpoints](#-api-endpoints)
5. [Directory Structure](#-directory-structure)
6. [Setup & Installation](#-setup--installation)

---

## 🎯 Core Features

### 1. Tone-Aware Script Generator
An AI engine designed to craft high-retention video scripts. 
- **Dynamic Hook Generation**: Automatically creates primary and alternative hooks to capture audience attention instantly.
- **Structured Storytelling**: Formats scripts with proven frameworks: `[HOOK]`, `[PROBLEM]`, `[SHIFT]`, `[VALUE]`, `[RESULT]`, and `[ENDING]`.
- **Tone Adjustments**: Tailors the output format (e.g., Conversational, Professional, Energetic) based on the target demographic.
- **LLM Redundancy**: Falls back across multiple Llama-3/Llama-4 models (e.g., 70b-versatile, 17b-instruct) to ensure high availability and robust output.

### 2. Multi-Language Caption Generator
A full-scale transcription and translation pipeline for global reach.
- **Whisper AI Transcription**: Transcribes audio/video files directly using Whisper-large-v3.
- **YouTube Integration**: Directly fetches transcripts from YouTube URLs via the `youtube-transcript` library.
- **Auto-Timestamps**: Intelligently builds or aligns segment timestamps for precise subtitle pacing.
- **Multi-Format Export**: Generates `.SRT`, `.VTT`, and raw `.TXT` formats simultaneously.
- **AI Translation**: Seamlessly translates captions into over 30 global languages (Hindi, Spanish, French, Japanese, etc.) using batched AI translation pipelines.

---

## 🎨 Frontend Architecture (UI)

The UI has been upgraded to a modern, production-grade **Single Page Application (SPA)** built with React, TypeScript, and Tailwind CSS v4, delivering a cinematic and premium user experience ("Aurora").

- **Technology Stack**: React, TypeScript, Tailwind CSS v4, React Router, Axios, motion/react.
- **Design System**: Features a cinematic black theme (`#0a0a0a`), premium motion with `motion/react`, and Apple/Linear-inspired minimal grayscale surfaces.
- **Authentication State**: Global state managed via `AuthContext.tsx` with persistent JWT-based sessions. Includes protected routing that redirects unauthorized users to login and forces multi-step onboarding for new users.
- **Location**: Client-side React code resides in the `/src` directory.

---

## ⚙️ Backend Architecture

The backend is a robust REST API combining Node.js/Express, MongoDB for data persistence, and the Groq API for LLM inferencing.

- **Technology Stack**: Node.js, Express.js, MongoDB (Mongoose), JSON Web Tokens (JWT).
- **Authentication System**: Complete production-grade auth flow featuring `bcryptjs` password hashing, secure `httpOnly` cookie persistence, and JWT middleware (`protect`).
- **File Handling**: Uses `Multer` (in-memory storage) for fast audio/video uploads.
- **AI Integration (Groq)**: High-speed inference engine for text completion and audio transcription with smart fallback mechanisms.

---

## 🔌 API Endpoints

### Authentication Endpoints
- **`POST /api/auth/signup`**: Validates input, hashes password, creates user, issues JWT cookie, and returns user data.
- **`POST /api/auth/login`**: Validates credentials against hashed passwords, issues JWT cookie.
- **`POST /api/auth/logout`**: Clears the secure JWT cookie.
- **`GET /api/auth/me`**: Returns the current authenticated user's profile (Protected).
- **`PUT /api/auth/onboarding`**: Updates the user's creator type, preferred tone, and primary language after signup (Protected).

### AI Generation Endpoints
### `POST /analyze`
Generates a highly-structured video script based on a prompt and tone.
- **Payload**: `{ "input": "Video topic...", "tone": "Conversational" }`
- **Response**: JSON containing the `full_script`, primary `hooks`, `alt_hooks`, and suggested `ideas`.

### `POST /caption`
Processes media (file upload, raw text, or YouTube URL) and outputs localized captions.
- **Payload (Multipart Form or JSON)**:
  - `type`: `"audio"` | `"url"` | `"text"`
  - `langs`: Array of target languages (e.g., `["en", "es"]`).
  - `formats`: Array of export formats (e.g., `["srt", "vtt"]`).

---

## 📁 Directory Structure

```text
/
├── server.js              # Express Application Entry Point
├── package.json           # Node.js dependencies and scripts
├── tsconfig.json          # TypeScript config for the frontend
├── .env                   # Environment variables (DB URI, API Keys, JWT_SECRET)
├── backend/
│   ├── models/            # MongoDB Mongoose schemas (User.js)
│   ├── routes/            # Auth and API routing
│   ├── controllers/       # Business logic (authController.js)
│   ├── middleware/        # Route protection logic (authMiddleware.js)
│   └── utils/             # Helpers (generateToken.js)
├── routes/                # AI routing (caption.js)
├── prompts/               # AI Prompt Engineering templates
├── public/                # Legacy Vanilla UI assets
└── src/                   # React TypeScript Frontend (Aurora)
    ├── pages/             # Login.tsx, Signup.tsx, Onboarding.tsx
    ├── components/        # React components
    ├── context/           # AuthContext.tsx
    ├── routes/            # ProtectedRoute.tsx
    └── services/          # API Axios calls (auth.ts)
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- A [Groq](https://groq.com/) API Key for AI inferencing.

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

### 3. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 4. Running the Application
Start the Node.js server:
```bash
npm start
```
By default, the server runs on `http://localhost:3000`. Open this URL in your browser to access the Nexus Creator Studio dashboard.
# Project-x
