# Project Name: [Undefined]

## 📌 Project Overview
**[Undefined]** is an AI-powered SaaS workspace designed for modern content creators. It provides an immersive, modular studio environment for generating viral scripts, multi-language captions, and high-CTR thumbnail concepts. The project heavily relies on advanced AI models (Llama via the Groq API) to automate and optimize the creative workflow.

The project currently features a custom premium design system, characterized by clean glass-morphism, sophisticated typography, and a unified SPA (Single Page Application) workspace architecture.

---

## 🏗️ Major Architecture (Start to End)
The repository is structured as a modular, high-performance web application featuring a unified Express backend and a sophisticated vanilla HTML/CSS/JS frontend.

### 1. Frontend Architecture (Client-Side)
- **Static Assets Delivery**: The Express server delivers the landing page and the SPA shell directly to the browser.
- **Landing Page (`public/index.html`)**: A high-conversion entry point using Vanilla HTML, CSS, and JS for dynamic scroll animations and feature mockups.
- **The Workspace SPA (`public/app/`)**: The core application shell. It uses a custom Vanilla JS router (`partials.js`) to dynamically load different tools (Script Studio, Caption Studio, Thumbnail Studio) into the main view without reloading the page.
- **State & UI Management**: Handled entirely via Vanilla JS (`app.js` and feature-specific controllers) interacting directly with the DOM.

### 2. Backend Architecture (Server-Side)
- **Entry Point (`server.js`)**: Initializes the Express application, serves the static frontend files, and listens on a specified port.
- **API Routing**: Handles internal POST requests from the frontend, formats AI prompts, and securely communicates with external APIs.
- **AI Processing Layer**: Constructs contextual prompts and streams or fetches responses using the Groq API for near-instant inference.

---

## 💻 Tech Stack
### Frontend (User Interface)
- **HTML5**: Semantic structure and modular partials.
- **CSS3 (Vanilla)**: Custom premium design system utilizing CSS Grid, Flexbox, Glass-morphism, and CSS variables. No external frameworks (like Tailwind or Bootstrap) are used, ensuring a unique visual identity.
- **JavaScript (Vanilla / ES6+)**: Handles all DOM manipulation, SPA routing, animations, and asynchronous API calls to the backend.

### Backend (Server & API)
- **Node.js**: The core runtime environment for the server.
- **Express.js**: The web framework used for routing API endpoints and serving static frontend files.
- **Axios / Node Fetch**: Used internally on the backend to make HTTP requests to third-party APIs.

### Third-Party APIs & Integrations
- **Groq API**: Powers the AI features (Scripting, Captions, Thumbnail analysis) using lightning-fast Llama models.
- **YouTube Transcript API**: Utilized for fetching existing captions and data from YouTube URLs.

---

## 🚀 Features (Present State)

### ✅ Completed Features
- **High-Conversion Landing Page**: Fully responsive with scroll-reveals, interactive mockups, and fixed-layout animations.
- **Script Studio**: An AI-powered script generator focusing on hook engineering, structured framework building ([PROBLEM], [SHIFT], [VALUE]), and distinct tone controls.
- **Caption Studio**: A multi-language subtitle generation environment supporting multiple localized outputs in a clean grid interface.
- **Thumbnail Studio**: An analytical tool for visual strategy, featuring visual DNA analysis, psychological trigger breakdown, and attention scoring.
- **Modular SPA Engine**: Seamless, non-reloading navigation between the different studio tools.

### ❌ Not Completed (Left to Do)
- **Login & Authentication System**: Currently **NOT COMPLETED**. There is no user authentication, session management, registration, or secure routing in place. Anyone can access the studio shell.
- **Database Integration**: User data, generated scripts, and past project histories are not being saved. We need to integrate a database (e.g., MongoDB, PostgreSQL, or Firebase).
- **User Dashboard**: A personalized hub to view past projects, usage statistics, and account settings is missing.
- **Payment Gateway Integration**: Stripe or similar integration is required to handle Free/Pro/Agency subscription tiers.
- **State Persistence**: If the user refreshes the page, their current AI-generated work inside the studio is lost.

---

## 🔒 Security

### Current State
- **API Key Protection**: External API keys (like `GROQ_API_KEY`) are kept on the backend in a `.env` file, preventing them from being exposed to the client-side browser.

### What We Should Do Further
- **Implement Authentication**: Build a secure JWT-based authentication system or OAuth (Google/Discord login) to restrict access to the studio.
- **Rate Limiting**: Add rate limiting to backend AI routes to prevent API abuse and control Groq API billing costs.
- **Input Sanitization**: Implement rigorous input validation and sanitization on both frontend and backend to prevent XSS (Cross-Site Scripting) and prompt injection attacks.
- **Production Readiness**: Setup CORS restrictions, Helmet.js for secure HTTP headers, and ensure HTTPS/SSL is configured for production deployment.

---

