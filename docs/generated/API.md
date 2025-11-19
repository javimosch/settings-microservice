# API Documentation

## Authentication

### Internal APIs
- Require session-based authentication
- Login via POST `/login` with username/password
- Session cookie is stored in MongoDB

### External APIs
- Require DynamicAuth validation
- Send headers:
  - `Authorization: Bearer <token>` (or custom auth header)
  - `X-Organization-Id: <org-id>`
  - `X-Auth-Name: <auth-name>` (optional, defaults to 'default')

## Internal API Endpoints

Base path: `/api/internal`

### Organizations

```bash
# List all organizations
GET /api/internal/organizations

# Create organization
POST /api/internal/organizations
{
  "name": "Organization Name"
}

# Update organization
PUT /api/internal/organizations/:id
{
  "name": "Updated Name"
}

# Delete organization
DELETE /api/internal/organizations/:id
```

### Global Settings

```bash
# List global settings
GET /api/internal/global-settings?organizationId=<org-id>

# Create global setting
POST /api/internal/global-settings
{
  "organizationId": "...",
  "settingKey": "max_users",
  "settingValue": 100,
  "description": "Maximum users allowed"
}

# Update global setting
PUT /api/internal/global-settings/:id
{
  "settingValue": 200,
  "description": "Updated description"
}

# Delete global setting
DELETE /api/internal/global-settings/:id
```

### Client Settings

```bash
# List client settings
GET /api/internal/client-settings?organizationId=<org-id>&clientId=<client-id>

# Create client setting
POST /api/internal/client-settings
{
  "organizationId": "...",
  "clientId": "client-123",
  "settingKey": "max_users",
  "settingValue": 50,
  "description": "Client specific limit"
}

# Update client setting
PUT /api/internal/client-settings/:id
{
  "settingValue": 75
}

# Delete client setting
DELETE /api/internal/client-settings/:id
```

### User Settings

```bash
# List user settings
GET /api/internal/user-settings?organizationId=<org-id>&userId=<user-id>

# Create user setting
POST /api/internal/user-settings
{
  "organizationId": "...",
  "userId": "user-456",
  "settingKey": "theme",
  "settingValue": "dark",
  "description": "User theme preference"
}

# Update user setting
PUT /api/internal/user-settings/:id
{
  "settingValue": "light"
}

# Delete user setting
DELETE /api/internal/user-settings/:id
```

### Dynamic Settings

```bash
# List dynamic settings
GET /api/internal/dynamic-settings?organizationId=<org-id>&uniqueId=<unique-id>

# Create dynamic setting
POST /api/internal/dynamic-settings
{
  "organizationId": "...",
  "uniqueId": "feature-flag-1",
  "settingKey": "enabled",
  "settingValue": true,
  "description": "Feature flag status"
}

# Update dynamic setting
PUT /api/internal/dynamic-settings/:id
{
  "settingValue": false
}

# Delete dynamic setting
DELETE /api/internal/dynamic-settings/:id
```

### DynamicAuth

```bash
# List dynamic auth configurations
GET /api/internal/dynamicauth?organizationId=<org-id>

# Create dynamic auth (HTTP type)
POST /api/internal/dynamicauth
{
  "organizationId": "...",
  "name": "oauth-provider",
  "type": "http",
  "http": {
    "url": "https://auth.example.com/validate",
    "method": "POST",
    "headers": {
      "Authorization": "{{headers.authorization}}"
    },
    "bodyParams": {
      "token": "{{headers.authorization}}"
    }
  },
  "cacheTTLSeconds": 300,
  "enabled": true,
  "description": "OAuth validation"
}

# Create dynamic auth (JS type)
POST /api/internal/dynamicauth
{
  "organizationId": "...",
  "name": "custom-auth",
  "type": "js",
  "jsCode": "const token = req.headers.authorization?.split(' ')[1]; if (token === 'valid-token') { return { ok: true, subject: { id: 'user-1', type: 'api-key' }, permissions: { globalSettings: { read: true, write: true } } }; } return { ok: false };",
  "cacheTTLSeconds": 60,
  "enabled": true,
  "description": "Custom JS validation"
}

# Update dynamic auth
PUT /api/internal/dynamicauth/:id
{
  "enabled": false
}

# Delete dynamic auth
DELETE /api/internal/dynamicauth/:id

# Try/Test dynamic auth
POST /api/internal/dynamicauth/:id/try
{
  "headers": {
    "authorization": "Bearer test-token"
  },
  "query": {},
  "body": {}
}

# Invalidate cache for auth
POST /api/internal/dynamicauth/:id/invalidate-cache
```

## External API Endpoints

Base path: `/api`

All endpoints require DynamicAuth headers.

### Settings Retrieval with Cascade

```bash
# Get setting with cascade resolution (User > Client > Global)
GET /api/global-settings/:settingKey?userId=<user-id>&clientId=<client-id>
Headers:
  Authorization: Bearer <token>
  X-Organization-Id: <org-id>
  X-Auth-Name: default

Response:
{
  "source": "user",  // or "client" or "global"
  "value": <setting-value>,
  "setting": { ... }
}
```

### Create/Update Settings

```bash
# Create or update global setting (requires write permission)
POST /api/global-settings
Headers:
  Authorization: Bearer <token>
  X-Organization-Id: <org-id>
  X-Auth-Name: default
Body:
{
  "settingKey": "api_rate_limit",
  "settingValue": 1000,
  "description": "API rate limit"
}
```

### Specific Setting Types

```bash
# Get client setting
GET /api/client-settings/:clientId/:settingKey
Headers:
  Authorization: Bearer <token>
  X-Organization-Id: <org-id>

# Get user setting
GET /api/user-settings/:userId/:settingKey
Headers:
  Authorization: Bearer <token>
  X-Organization-Id: <org-id>

# Get dynamic setting
GET /api/dynamic-settings/:uniqueId/:settingKey
Headers:
  Authorization: Bearer <token>
  X-Organization-Id: <org-id>
```

## DynamicAuth JS Function Format

JS functions must return an object with:

```javascript
{
  ok: boolean,              // Required: authentication success
  subject?: {               // Optional: authenticated subject info
    id: string,
    type: string
  },
  permissions?: {           // Optional: permissions object
    globalSettings: {
      read: boolean,
      write: boolean
    },
    clientSettings: {
      crud: boolean
    },
    // ... etc
  },
  ttl?: number,            // Optional: cache TTL in seconds
  error?: string           // Optional: error message if ok is false
}
```

Example:

```javascript
const auth = req.headers?.authorization || '';
const token = auth.split(' ')[1];

if (!token) return { ok: false };

if (token === 'valid-api-key') {
  return {
    ok: true,
    subject: { id: 'api-client-1', type: 'api-key' },
    permissions: {
      globalSettings: { read: true, write: true },
      clientSettings: { crud: false }
    },
    ttl: 300
  };
}

return { ok: false, error: 'Invalid token' };
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details (if available)"
}
```

Common HTTP status codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (auth failed)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error
