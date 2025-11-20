# Settings Microservice

A production-ready, multi-tenant settings microservice built with Node.js, Express and MongoDB. It provides a central place to manage configuration, feature flags and per-tenant overrides for your applications.

## Features

- Multi-tenant organization support
- Three-tier settings: Global / Client / User + Dynamic settings
- Cascade resolution (User → Client → Global) with LRU caching
- DynamicAuth system (HTTP + sandboxed JavaScript)
- JWT helper functions and filter-based permission enforcement
- Internal admin UI (sessions) under `/api/internal/*`
- External REST API (bearer token via DynamicAuth) under `/api/*`
- CLI tool that talks to the same external API surface

## Quickstart

1. Copy `.env.example` to `.env` and configure at least:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start MongoDB (local or Docker) and then start the server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Access

- Admin UI: http://localhost:3000 (or `PORT` from `.env`)
- Default login: credentials from `.env` (initially `admin` / `admin123`)

To see the full workflow and verify everything is wired correctly:

```bash
./test.sh   # automated checks
./demo.sh   # full end-to-end demo (organizations, settings, DynamicAuth, cascade)
```

## APIs

### Internal APIs (session auth)

- `POST /login` – create session
- `GET /api/internal/organizations` – list organizations
- `POST /api/internal/organizations` – create organization
- CRUD for:
  - `/api/internal/global-settings`
  - `/api/internal/client-settings`
  - `/api/internal/user-settings`
  - `/api/internal/dynamic-settings`
  - `/api/internal/dynamicauth` (create/test/invalidate cache)

### External APIs (DynamicAuth)

External callers authenticate via DynamicAuth. Standard headers:

```http
Authorization: Bearer <token>
X-Organization-Id: <org-id>
X-Auth-Name: default
```

Key capabilities:

- Cascade lookup:
  - `GET /api/global-settings/:settingKey?userId=<userId>&clientId=<clientId>`
- Direct lookups:
  - `GET /api/client-settings/:clientId/:settingKey`
  - `GET /api/user-settings/:userId/:settingKey`
  - `GET /api/dynamic-settings/:uniqueId/:settingKey`
- Bulk retrieval (per entity):
  - `GET /api/client-settings/all/:clientId`
  - `GET /api/user-settings/all/:userId`
  - `GET /api/dynamic-settings/all/:uniqueId`
- Full CRUD under `/api/settings/*` for global/client/user/dynamic settings

Permissions (read/write, with optional filters) are returned by DynamicAuth and enforced at query and record level.

## CLI

A Node-based CLI (`./cli.js`) is included for working with the external API:

- Configure token, organization and auth name
- Manage global/client/user/dynamic settings
- Exercise bulk retrieval routes (get all settings for a client, user or uniqueId)

See `docs/generated/CLI-README.md` and `docs/generated/QUICK-REFERENCE.md` for details.

## Documentation

The `docs/generated` folder contains deeper docs generated for this codebase:

- `OVERVIEW.md` – high-level architecture and concepts
- `START-HERE.md` / `QUICKSTART.md` – setup and walkthrough
- `API.md` / `API-ROUTES.md` – complete API reference
- `SETTINGS-CASCADE.md` – how cascade resolution works
- `JWT-AUTH-EXAMPLE.md`, `PERMISSION-ENFORCEMENT*.md` – auth and permissions

Open `docs/index.html` in a browser for a Tailwind landing page that links into the most important documentation.

## Security & Scaling

- Rate limiting on `/api/*`
- Secure, HTTP-only cookies and Mongo-backed sessions
- Sandboxed JavaScript execution with `vm2` for DynamicAuth
- Recommended production hardening: Redis cache, hardened CORS, stronger secrets, audit logging (see `docs/generated/OVERVIEW.md`).

