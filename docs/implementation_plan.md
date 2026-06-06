# Implementation Plan — Repository Restructuring for Deployment

This plan details the migration of the Aurora codebase into a separated deployment architecture containing clean `frontend`, `admin`, `backend`, `docs`, and `scripts` workspaces.

## User Review Required

> [!IMPORTANT]
> **Static File Serving:** The backend Express server will statically serve both the frontend files and admin dashboard locally, keeping single-port execution intact. In production, these directories (`frontend/public` and `admin/public`) can be served directly by Nginx or static host CDNs.
> **Avatar Upload Directory:** User avatar uploads will now save into `backend/uploads/avatars` rather than inside frontend directories, decoupling data storage from static code assets.

---

## Proposed Changes

### 1. root directory
* Create `docker-compose.yml` for multi-container local configuration.
* Create `.env.example` file.
* Update `package.json` at root to support concurrent startup of frontend and backend.

#### [NEW] [docker-compose.yml](file:///c:/Users/zenix/Desktop/Projectx/docker-compose.yml)
#### [NEW] [.env.example](file:///c:/Users/zenix/Desktop/Projectx/.env.example)

---

### 2. frontend workspace
* Move all Vite/React files (`src/`, `index.html`, `vite.config.ts`, `tsconfig.json`) into `frontend/`.
* Move static public assets (`public/` EXCEPT admin files) into `frontend/public/`.
* Create `frontend/package.json` with react, tailwind, and vite dependencies.

#### [NEW] [frontend/package.json](file:///c:/Users/zenix/Desktop/Projectx/frontend/package.json)
#### [NEW] [frontend/public/](file:///c:/Users/zenix/Desktop/Projectx/frontend/public)
#### [NEW] [frontend/src/](file:///c:/Users/zenix/Desktop/Projectx/frontend/src)

---

### 3. admin workspace
* Create a dedicated `admin/` directory.
* Move `admin-login.html`, `admin.html`, `css/admin.css`, and `js/admin.js` into `admin/public/`.
* Rename `admin.html` to `index.html` and `admin-login.html` to `login.html` within `admin/public/` for cleaner route mapping.

#### [NEW] [admin/public/](file:///c:/Users/zenix/Desktop/Projectx/admin/public)

---

### 4. backend workspace
* Move `server.js` to `backend/server.js`.
* Update static serving paths in `server.js` to route `/` to `frontend/public` and `/admin` to `admin/public`.
* Move routes, models, services, middlewares, prompts, and utilities to `backend/src/`.
* Update internal `require` paths in all backend scripts to point relative to the new `backend/src/` structure.
* Create `backend/package.json` with express, mongoose, bcrypt, jwt, sharp, and nodemailer dependencies.

#### [NEW] [backend/package.json](file:///c:/Users/zenix/Desktop/Projectx/backend/package.json)
#### [NEW] [backend/server.js](file:///c:/Users/zenix/Desktop/Projectx/backend/server.js)
#### [NEW] [backend/src/](file:///c:/Users/zenix/Desktop/Projectx/backend/src)

---

### 5. docs & scripts workspaces
* Move walkthrough.md and other artifacts into `docs/`.
* Move scratch/ debug scripts into `scripts/`.

#### [NEW] [docs/](file:///c:/Users/zenix/Desktop/Projectx/docs)
#### [NEW] [scripts/](file:///c:/Users/zenix/Desktop/Projectx/scripts)

---

## Path Adjustments Mapping

Here is the exact module resolution mapping that will be executed for backend files:

| Original Path | Restructured Path |
| :--- | :--- |
| `routes/*.js` | `backend/src/routes/*.js` |
| `backend/routes/*.js` | `backend/src/routes/*.js` |
| `backend/models/*.js` | `backend/src/models/*.js` |
| `backend/middleware/*.js` | `backend/src/middleware/*.js` |
| `backend/services/*.js` | `backend/src/services/*.js` |
| `services/auth/*.js` | `backend/src/services/auth/*.js` |
| `services/prompts/*.js` | `backend/src/services/prompts/*.js` |
| `services/imageGeneration/` | `backend/src/ai/imageGeneration/` |
| `prompts/*.js` | `backend/src/ai/prompts/*.js` |
| `utils/*.js` | `backend/src/utils/*.js` |
| `backend/gemini.js` | `backend/src/ai/gemini.js` |

---

## Verification Plan

## Automated Checks
* Run `node backend/server.js` locally to ensure server boots up without syntax errors or broken module imports.
* Validate MongoDB Atlas connection.

### Manual Verification
* Navigate to `http://localhost:3000/` and verify the marketing landing page loads.
* Navigate to `http://localhost:3000/app/` and verify the creator dashboard welcome metrics load.
* Navigate to `http://localhost:3000/admin/login` and verify the admin page login page is visible.
