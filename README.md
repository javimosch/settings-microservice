# Settings Microservice

A multi-tenant settings microservice with dynamic authentication.

## Features

- Multi-tenant organization support
- Three-tier settings (Global/Client/User) + Dynamic Settings
- Internal UI protected by Basic Auth + sessions
- External APIs with DynamicAuth (HTTP/JS based validation)
- Settings cascade resolution
- In-memory caching with LRU

## Setup

1. Copy `.env.example` to `.env` and configure
2. Install dependencies: `npm install`
3. Start MongoDB
4. Run: `npm start` (or `npm run dev` for development)

## Access

- Internal UI: http://localhost:3000
- Login with credentials from .env (default: admin/admin123)

## API Documentation

### Internal APIs (require session auth)
- GET /api/internal/organizations
- POST /api/internal/organizations
- PUT /api/internal/organizations/:id
- DELETE /api/internal/organizations/:id
- CRUD endpoints for settings and DynamicAuth

### External APIs (require DynamicAuth)
- GET /api/global-settings/:settingKey
- GET /api/client-settings/:clientId/:settingKey
- GET /api/user-settings/:userId/:settingKey
- POST /api/global-settings (with permissions)
