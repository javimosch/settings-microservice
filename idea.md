# Overview

A compact, production-minded design for a **Node.js + Express + EJS + TailwindCDN + Mongoose** microservice that centralizes settings for multiple organizations and exposes them to internal UI and external apps. Key features:

* Multi-tenant (organizationId on all collections)
* Three-tier settings (Global / Client / User) + DynamicSettings
* Internal UI protected by Basic Auth + session cookie (express-session persisted to DB)
* External APIs protected by **DynamicAuth**: admins create "auth middlewares" (HTTP-call or JS Function) that validate incoming API-Key/JWT and set `req.permissions`
* Secure sandboxing for JS functions (run with limited libs like axios)
* Caching of validation results (in-memory LRU or Redis for multi-instance)
* `/api/internal/*` for UI; `/api/*` for external clients
* Indexes & uniqueness enforced at DB level (org + key combos)

---

# Data models (Mongoose schemas)

```js
// common fields
const common = {
  organizationId: { type: mongoose.Types.ObjectId, required: true, index: true },
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

// Organization
const OrganizationSchema = new Schema({
  name: { type: String, required: true, unique: true },
  ...common
});

// GlobalSettings
const GlobalSettingSchema = new Schema({
  organizationId: { type: ObjectId, required: true },
  settingKey: { type: String, required: true },
  settingValue: Schema.Types.Mixed,
  description: String,
  ...common
});
GlobalSettingSchema.index({ organizationId: 1, settingKey: 1 }, { unique: true });

// ClientSettings
const ClientSettingSchema = new Schema({
  organizationId: { type: ObjectId, required: true },
  clientId: { type: String, required: true },
  settingKey: { type: String, required: true },
  settingValue: Schema.Types.Mixed,
  description: String,
  ...common
});
ClientSettingSchema.index({ organizationId: 1, clientId: 1, settingKey: 1 }, { unique: true });

// UserSettings
const UserSettingSchema = new Schema({
  organizationId: { type: ObjectId, required: true },
  userId: { type: String, required: true },
  settingKey: { type: String, required: true },
  settingValue: Schema.Types.Mixed,
  description: String,
  ...common
});
UserSettingSchema.index({ organizationId: 1, userId: 1, settingKey: 1 }, { unique: true });

// DynamicSettings (free-form)
const DynamicSettingSchema = new Schema({
  organizationId: { type: ObjectId, required: true },
  uniqueId: { type: String, required: true }, // admin-defined unique id
  settingKey: { type: String, required: true },
  settingValue: Schema.Types.Mixed,
  description: String,
  ...common
});
DynamicSettingSchema.index({ organizationId: 1, uniqueId: 1, settingKey: 1 }, { unique: true });

// DynamicAuth (auth middleware definitions)
const DynamicAuthSchema = new Schema({
  organizationId: { type: ObjectId, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['http', 'js'], required: true },
  // http type fields
  http: {
    url: String,
    method: { type: String, enum: ['GET','POST','PUT','DELETE'], default: 'POST' },
    queryParams: Schema.Types.Mixed, // JSON to be converted to querystring
    bodyParams: Schema.Types.Mixed,
    headers: Schema.Types.Mixed
  },
  // js type field
  jsCode: String,
  // Controls
  cacheTTLSeconds: { type: Number, default: 60 }, // TTL for validation results
  enabled: { type: Boolean, default: true },
  description: String,
  ...common
});
DynamicAuthSchema.index({ organizationId: 1, name: 1 }, { unique: true });
```

---

# Indexes & uniqueness

* GlobalSettings: `(organizationId, settingKey)` unique
* ClientSettings: `(organizationId, clientId, settingKey)` unique
* UserSettings: `(organizationId, userId, settingKey)` unique
* DynamicSettings: `(organizationId, uniqueId, settingKey)` unique
* DynamicAuth: `(organizationId, name)` unique

Always enforce in MongoDB (unique indexes) and validate in Mongoose.

---

# API structure (routes)

* Internal UI APIs (require session cookie auth): prefixed `/api/internal`

  * `GET /api/internal/organizations`
  * `POST /api/internal/organizations`
  * `PUT /api/internal/organizations/:id`
  * `DELETE /api/internal/organizations/:id`
  * CRUD for allowed setting definitions and DynamicAuth definitions (create/edit/delete)
  * `POST /api/internal/dynamicauth/:id/try` — run a test using provided headers/body (used by UI Try buttons)

* External APIs (protected by DynamicAuth): prefixed `/api`

  * `GET /api/global-settings/:settingKey?clientId=&userId=` — resolves cascade: user -> client -> global -> dynamic
  * `POST /api/global-settings` (create/update) — requires permission from DynamicAuth
  * `GET /api/client-settings/:clientId/:settingKey`
  * `GET /api/user-settings/:userId/:settingKey`
  * `POST /api/dynamic-settings/:uniqueId` etc.

Implementation detail: External routes must run the **DynamicAuth runner** for the organization before they proceed.

---

# Auth for UI (internal)

* Basic auth for UI login page (username/password) — but production: use environment-based admin user(s) + hashed password
* On successful Basic Auth: create a session (express-session) persisted to MongoDB (connect-mongo) so multiple instances share sessions.
* Session cookie protects `/api/internal/*` endpoints and UI pages.

Example middleware:

```js
app.use('/api/internal', sessionMiddleware, requireLogin); // requireLogin checks session
```

Session cookie should be `HttpOnly`, `Secure` (when TLS), with proper sameSite.

---

# DynamicAuth — concept & UI representation

Admin UI model for a DynamicAuth entry:

* `Name` (string)
* `Type` = `HTTP call` or `JS Function`
* If HTTP call:

  * `URL`
  * `Method` (GET/POST)
  * `Query params` (JSON object) — replaced with templating variables at call time
  * `Body params` (JSON)
  * `Headers` (JSON)
  * `Timeout`
* If JS function:

  * `Code` (string) — JS function body, with `function handler(req, axios) { ... }` signature
* Additional:

  * `Cache TTL (seconds)`
  * `Enabled`
  * `Description`

Templating in HTTP fields supports simple variables:

* `$headers.Authorization`, `$body.token`, `$query.clientId`, `$orgId`, etc.
  Use a tiny template engine (e.g., `mustache` or simple replacement) — not full evaluation.

---

# DynamicAuth execution flow (external API request)

1. External request arrives at `/api/...` with org context (e.g., header `X-Org-Id` or subdomain).
2. Express middleware `dynamicAuthExecutor` loads the configured DynamicAuth for that org (one or more).

   * You can allow multiple dynamic auth definitions and chain them, or select which one the client uses via `X-Auth-Name` header. Choose approach based on UX.
3. For chosen DynamicAuth:

   * If cached validation exists for same token/key, use cached result.
   * Else execute:

     * If `http` type: build HTTP call (resolve templates), call remote endpoint (axios) with configured headers/body/query.
     * If `js` type: execute in sandboxed JS runner with access to trimmed `req` object + axios (HTTP client) + a `cache` and `log` object.
4. JS/http auth must return an object with at least `{ ok: boolean, subject?: { id, type }, permissions?: { ... } , ttl?: seconds }`
5. Middleware sets `req.auth = { ok, subject }` and `req.permissions = permissions || defaultPermissions`
6. If `ok` false -> respond `401` or `403`. If ok -> continue to route handler which enforces `req.permissions` for CRUD operations.

---

# JS sandboxing approach

**Don't `eval()` user JS in-process without sandboxing.** Options:

* **Preferred (simple):** use `vm2` sandbox + a separate Node child process or worker thread. Provide only safe libs: `axios` (pre-imported), a `safeConsole` wrapper, and a shallow read-only `req` object. Run with strict timeout and memory limits.
* **Safer (enterprise):** run each function in a short-lived container / micro-VM or in an isolated service (recommended for highly sensitive systems).
* **For POC:** `vm2` with `VM({ timeout, sandbox: { axios: proxiedAxios, req: safeReq } })` and validate code length.

Example pattern (vm2):

```js
const { VM } = require('vm2');

function runJsAuth(jsCode, req, axiosInstance, timeoutMs = 500) {
  const safeReq = {
    headers: req.headers,
    query: req.query,
    body: req.body,
    method: req.method,
    path: req.path
  };
  const vm = new VM({
    timeout: timeoutMs,
    sandbox: {
      req: safeReq,
      axios: axiosInstance,
      console: {
        log: (...args) => {/* capture or no-op */}
      },
    }
  });
  // jsCode expected to define `module.exports = async function(req, axios) { ... }`
  const wrapped = `"use strict"; module = {}; ${jsCode}; module.exports;`;
  const fn = vm.run(wrapped);
  return Promise.resolve().then(() => fn(safeReq, axiosInstance));
}
```

**Caveats:** `vm2` has had vulnerabilities historically — put a strict timeout and run in a worker process or container for production.

---

# HTTP-call middleware execution

* Build request from template fields (replace `$headers.Authorization` etc.)
* Call remote URL with axios, timeout and retry policy (very limited retries)
* Validate response shape (e.g., expect `{ ok: true, permissions: {...} }`)
* Return validated permissions and subject

Example call template resolution: use `mustache` or simple `{{headers.Authorization}}` replacement.

---

# Caching strategy

Two options:

* **Single-instance / POC:** in-process LRU cache (e.g., `lru-cache`) keyed by `orgId + authName + token` mapping to `{ ok, subject, permissions, expiry }`.
* **Multi-instance / production (recommended):** Redis (or Memcached). Cache key includes `orgId|authName|token|fingerprint`.

  * TTL: use `DynamicAuth.cacheTTLSeconds` or returned `ttl` from auth call.
  * Cache invalidation: when admin edits DynamicAuth, invalidate keys for that authName (store key prefix metadata in Redis).

Caching implementation notes:

* Cache only positive validations (and optionally negative ones for short TTL).
* Use a fingerprint function: e.g., `sha256(Authorization header + other identifying headers + orgId)`.

---

# Permission model & enforcement

* Admin defines default permission template per org (optional).
* DynamicAuth validation may set `req.permissions` with granular flags:

  * `globalSettings: { read: true, write: false }`
  * `clientSettings: { crud: true }`
  * `userSettings: { delete:false, update:true }`
* Route-level middleware inspects `req.permissions` and enforces allowed actions.
* If `req.permissions` is missing, fallback to a conservative default (deny writes, allow reads only if public).

Example enforcement middleware:

```js
function requirePermission(entity, op) {
  return function (req, res, next) {
    const perms = req.permissions || {};
    const entPerm = perms[entity] || {};
    if (entPerm[op] || (entPerm.crud && (op==='create' || op==='read' || op==='update' || op==='delete'))) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}
```

---

# UI: pages and behavior (EJS + TailwindCDN)

Tailwind via CDN for POC (include via `<script src="https://cdn.tailwindcss.com"></script>` in layout).

Primary pages:

* Login (Basic auth)
* Organizations list + create
* Organization switcher (top navbar) — sets `req.session.organizationId`
* Dashboard for selected organization
* Settings pages:

  * Allowed GlobalSettings (CRUD)
  * Allowed ClientSettings definitions (CRUD)
  * Allowed UserSettings definitions (CRUD)
  * Allowed DynamicSettings (CRUD)
* DynamicAuth page:

  * List of DynamicAuth entries
  * Create/Edit form:

    * Type toggle (HTTP / JS)
    * For HTTP: fields for URL, method, query/body/headers JSON editors
    * For JS: code editor (simple `<textarea>` for POC; integrate Ace/Monaco later)
    * Cache TTL
  * **Try panel**: collapsible form to provide test `headers`, `body`, `query`, `orgId` and a Try button

    * Try button calls `/api/internal/dynamicauth/:id/try` (POST) -> server executes auth logic in sandbox or makes HTTP call and returns result to UI
* Activity / logs view (last validations, last errors)

EJS templates structure:

```
views/
  layout.ejs
  login.ejs
  orgs/index.ejs
  auths/list.ejs
  auths/edit.ejs
  settings/global/list.ejs
  settings/global/edit.ejs
  partials/_orgSwitcher.ejs
  partials/_topbar.ejs
```

---

# Internal API: Try endpoint

`POST /api/internal/dynamicauth/:id/try`

Body:

```json
{
  "headers": { "Authorization": "Bearer XXX" },
  "body": { "token": "xxx" },
  "query": { "clientId": "abc" }
}
```

Server logic:

1. Load DynamicAuth config.
2. Build a safe `req` mimic with those fields.
3. Execute the auth (cache bypassed for Try).
4. Return execution result: `{ ok, subject, permissions, logs, durationMs, error }`

This is the value shown in the UI Try panel.

---

# Example: external endpoint flow (get setting)

```js
app.get('/api/global-settings/:key', dynamicAuthMiddleware, async (req, res) => {
  if (!req.auth || !req.auth.ok) return res.status(401).json({ error: 'unauthenticated' });
  // permission check
  if (!req.permissions?.globalSettings?.read) return res.status(403).json({ error: 'forbidden' });

  const { organizationId } = req; // from header or token
  const { key } = req.params;
  // resolution order: user -> client -> global
  const userId = req.query.userId;
  const clientId = req.query.clientId;

  // try user
  if (userId) {
    const us = await UserSetting.findOne({ organizationId, userId, settingKey: key });
    if (us) return res.json({ value: us.settingValue, source: 'user' });
  }
  // try client
  if (clientId) {
    const cs = await ClientSetting.findOne({ organizationId, clientId, settingKey: key });
    if (cs) return res.json({ value: cs.settingValue, source: 'client' });
  }
  // global
  const gs = await GlobalSetting.findOne({ organizationId, settingKey: key });
  if (gs) return res.json({ value: gs.settingValue, source: 'global' });

  // dynamic settings fallback
  const dyn = await DynamicSetting.findOne({ organizationId, settingKey: key });
  if (dyn) return res.json({ value: dyn.settingValue, source: 'dynamic' });

  return res.status(404).json({ error: 'not found' });
});
```

---

# Session store & internal API security

* `express-session` with `connect-mongo` to persist sessions.
* Session cookie config:

  * `cookie: { httpOnly: true, secure: true (in prod), sameSite: 'lax', maxAge: ... }`
* Basic auth login route sets session with `user` and `organizationId` selected.
* All `/api/internal/*` check `req.session` and `req.session.user` and `req.session.organizationId`.

---

# Logs & Auditing

* Store audit logs for:

  * DynamicAuth executions (timestamp, orgId, authName, tokenFingerprint, ok, durationMs, error)
  * Settings changes (who, what, before/after)
* For production, ship logs to centralized store (ELK, Papertrail, etc.)
* Keep logs retention policy and PII redaction (never store full Authorization header in plain logs — store fingerprint only).

---

# Security considerations

* **Never** run admin-provided JS code without sandbox and strict timeouts / memory limits.
* Limit what `axios` can access from the sandbox (e.g., disallow private network calls if your auth endpoints are external-only).
* Validate all fields stored as JSON (use JSON Schema when possible).
* Rate-limit external APIs (express-rate-limit or API gateway).
* Resist header injection and template injection: sanitize template replacements.
* Use HTTPS everywhere; cookies Secure+HttpOnly.
* CSRF for internal UI forms (or rely on session+sameSite).
* Escape variables in EJS templates to avoid XSS.
* Validate and sanitize DynamicAuth HTTP target URLs (allowlist domains if needed).

---

# Scaling & deployment

* Stateless app instances + shared MongoDB + Redis for cache + shared session store (Mongo or Redis)
* Use horizontal scaling with Redis cache to share validation cache
* For JS sandbox: worker pool or external sandbox service to avoid blocking Node event loop
* Use health checks, metrics, and circuit-breaker when calling external HTTP auth providers

---

# Operational UX details

* Admin can create multiple DynamicAuth entries. Choose one per client via header `X-Auth-Name` or default per client in DB.
* Provide UI to **simulate** a request with sample headers/body (Try).
* Provide ability to **preview** template-resolved HTTP call before executing (for debugging).
* Provide a UI to **invalidate cache** for a given auth entry.

---

# Minimal package list / tech choices

* express, express-session, connect-mongo
* mongoose
* axios
* vm2 (or worker_threads + safe runner) for JS sandboxing
* lru-cache (for POC) / ioredis (prod caching)
* mustache or handlebars-lite (for template resolution)
* helmet, express-rate-limit, cors
* winston or pino for logging

---

# To-do / Implementation checklist (sprints)

1. **Sprint 1 (POC)**

   * Project skeleton, authentication (basic + sessions persisted), org CRUD, simple org switcher UI
   * Mongoose models + indexes for settings
   * Basic settings CRUD UI (global/client/user/dynamic) — EJS + TailwindCDN
   * External read endpoint with simple token header check (static)

2. **Sprint 2 (DynamicAuth POC)**

   * DynamicAuth model + HTTP type execution
   * Try endpoint + UI for HTTP-call testing
   * Basic caching via in-memory LRU

3. **Sprint 3 (JS sandbox + permissions)**

   * Integrate `vm2` or worker sandbox for JS functions
   * Implement permission propagation to `req.permissions`
   * Enforcement middleware for CRUD operations

4. **Sprint 4 (Production hardening)**

   * Replace in-memory cache with Redis
   * Persist sessions to DB or Redis if not already
   * Add logging & audit trails
   * Add rate limiting and input validation

5. **Sprint 5 (Scale & Security)**

   * Move JS execution to isolated worker pool or containerized service
   * Add allowlists, domain limiting, thorough security review

---

# Example JS function template for admins (stored in DynamicAuth.jsCode)

```js
// Admin can edit the body of this function. The system will wrap and execute it.
// Must return: { ok: boolean, subject?: { id, type }, permissions?: {...}, ttl?: seconds }

module.exports = async function(req, axios) {
  // simple token check example
  const auth = req.headers?.authorization || '';
  const token = auth.split(' ')[1];

  if (!token) return { ok: false };

  // local allowlist token
  if (token === 'xxx') {
    return {
      ok: true,
      subject: { id: 'user-xxx', type: 'api-key' },
      permissions: {
        globalSettings: { read: true, write: false },
        clientSettings: { crud: false },
        userSettings: { read: true, update: true }
      },
      ttl: 120
    };
  }

  // or call external identity provider
  try {
    const resp = await axios.post('https://id.example.com/verify', { token });
    if (resp.data && resp.data.valid) {
      return {
        ok: true,
        subject: { id: resp.data.sub, type: 'jwt' },
        permissions: resp.data.permissions || {},
        ttl: resp.data.ttl || 60
      };
    }
    return { ok: false };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};
```

---

# Quick notes & recommendations

* For flexible attachment of auth per external client, let admins map API clients to a DynamicAuth entry (so external clients can send `X-Client-Id` and the middleware picks the right auth config).
* Return consistent error payloads for external APIs (HTTP status + code + message).
* Keep the Try execution **restricted** in UI: no unlimited network access; log and monitor tries.
* Document the templating variables available for HTTP-call type (headers, query, body, orgId, ip, path).

---

If you want, I can:

* produce the full Express route file skeletons (controllers + middlewares) and EJS templates for the main pages, or
* generate a runnable minimal POC repository (package.json, server.js, models, a few EJS views) to start with.

Which one do you want next?
