# Workspace Restructuring Tasks

- `[x]` Task 1: Create directory skeleton (`frontend`, `admin`, `backend`, `docs`, `scripts`)
- `[x]` Task 2: Create root configuration files (`.env.example`, `docker-compose.yml`, root `package.json` for concurrent execution)
- `[x]` Task 3: Migrate frontend files (`src`, `vite.config.ts`, `tsconfig.json`, `index.html`, React static `public` assets)
- `[x]` Task 4: Migrate admin files (`public/app/admin.html`, `js/admin.js`, `css/admin.css`, `admin-login.html`) into `admin/public/`
- `[x]` Task 5: Migrate backend files into `backend/server.js` and `backend/src/` routes, controllers, services, models, middlewares, prompts, and utils
- `[x]` Task 6: Adjust backend require paths and static file routing in `backend/server.js` and all moved submodules
- `[x]` Task 7: Move scripts and docs to `scripts/` and `docs/`
- `[x]` Task 8: Local verification (npm start, verify layout routing & database connectivity)
