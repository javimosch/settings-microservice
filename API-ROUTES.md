# API Routes Architecture

## 🏗️ Two API Layers

### 1. Internal API (`/api/internal/*`)
**Purpose**: Web UI Only  
**Authentication**: Session-based (login required)  
**Use Case**: Dashboard, settings management UI

```
/api/internal/organizations         - CRUD Organizations
/api/internal/global-settings       - CRUD Global Settings
/api/internal/client-settings       - CRUD Client Settings
/api/internal/user-settings         - CRUD User Settings
/api/internal/dynamic-settings      - CRUD Dynamic Settings
/api/internal/dynamic-auth          - CRUD DynamicAuth Configs
```

**Example**:
```bash
# Login first to get session cookie
POST /login
  username=admin&password=admin123

# Then use internal API
GET /api/internal/global-settings?organizationId=507f1f77bcf86cd799439011
Cookie: connect.sid=s%3A...
```

---

### 2. External API (`/api/*`)
**Purpose**: CLI, External Applications, Integrations  
**Authentication**: DynamicAuth (Bearer token)  
**Use Case**: Programmatic access, automation, external tools

```
# Cascade Resolution (original endpoints)
GET  /api/global-settings/:settingKey
POST /api/global-settings
GET  /api/client-settings/all/:clientId              # Get all settings for clientId
GET  /api/client-settings/:clientId/:settingKey
GET  /api/client-settings/:settingKey?clientId=xxx   # Alternative: get by key
GET  /api/user-settings/all/:userId                  # Get all settings for userId
GET  /api/user-settings/:userId/:settingKey
GET  /api/user-settings/:settingKey?userId=xxx       # Alternative: get by key
GET  /api/dynamic-settings/all/:uniqueId             # Get all settings for uniqueId
GET  /api/dynamic-settings/:uniqueId/:settingKey
GET  /api/dynamic-settings/:settingKey?uniqueId=xxx  # Alternative: get by key

# Full CRUD Operations
GET    /api/settings/global          - List all global settings
GET    /api/settings/global/:id      - Get single global setting by ID
POST   /api/settings/global          - Create global setting
PUT    /api/settings/global/:id      - Update global setting
DELETE /api/settings/global/:id      - Delete global setting

GET    /api/settings/client          - List client settings
GET    /api/settings/client/:id      - Get single client setting by ID
POST   /api/settings/client          - Create client setting
PUT    /api/settings/client/:id      - Update client setting
DELETE /api/settings/client/:id      - Delete client setting

GET    /api/settings/user            - List user settings
GET    /api/settings/user/:id        - Get single user setting by ID
POST   /api/settings/user            - Create user setting
PUT    /api/settings/user/:id        - Update user setting
DELETE /api/settings/user/:id        - Delete user setting

GET    /api/settings/dynamic         - List dynamic settings
GET    /api/settings/dynamic/:id     - Get single dynamic setting by ID
POST   /api/settings/dynamic         - Create dynamic setting
PUT    /api/settings/dynamic/:id     - Update dynamic setting
DELETE /api/settings/dynamic/:id     - Delete dynamic setting
```

**Example**:
```bash
# No login needed - use bearer token
GET /api/settings/global
Authorization: Bearer demo-token-123
X-Organization-Id: 507f1f77bcf86cd799439011
X-Auth-Name: default
```

---

## 🔐 Authentication Comparison

| Feature | Internal API | External API |
|---------|--------------|--------------|
| Auth Method | Session Cookie | Bearer Token |
| Login Required | Yes (`/login`) | No |
| Organization ID | Query param or body | Header (`X-Organization-Id`) |
| Auth Name | N/A | Header (`X-Auth-Name`) |
| Permissions | Session-based | DynamicAuth permissions |
| Use Case | Web UI | CLI, Apps, Scripts |

---

## 📋 Full External API Reference

### Headers Required
```
Authorization: Bearer <token>
X-Organization-Id: <org-id>
X-Auth-Name: <auth-config-name>  (default: "default")
Content-Type: application/json
```

### Global Settings

#### List Global Settings
```http
GET /api/settings/global
```

**Response**:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "organizationId": "507f191e810c19729de860ea",
    "settingKey": "max_users",
    "settingValue": 100,
    "description": "Maximum users",
    "createdBy": "api-user",
    "createdAt": "2025-11-18T19:00:00.000Z",
    "updatedAt": "2025-11-18T19:00:00.000Z"
  }
]
```

#### Create Global Setting
```http
POST /api/settings/global
Content-Type: application/json

{
  "settingKey": "max_users",
  "settingValue": 100,
  "description": "Maximum users allowed"
}
```

**Permissions Required**: `globalSettings.write`

#### Get Global Setting by ID
```http
GET /api/settings/global/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "organizationId": "507f191e810c19729de860ea",
  "settingKey": "max_users",
  "settingValue": 100,
  "description": "Maximum users allowed",
  "createdBy": "api-user",
  "createdAt": "2025-11-18T19:00:00.000Z",
  "updatedAt": "2025-11-18T19:00:00.000Z"
}
```

#### Update Global Setting
```http
PUT /api/settings/global/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "settingValue": 150,
  "description": "Updated maximum"
}
```

**Permissions Required**: `globalSettings.write`

#### Delete Global Setting
```http
DELETE /api/settings/global/507f1f77bcf86cd799439011
```

**Permissions Required**: `globalSettings.write`

**Response**:
```json
{
  "message": "Setting deleted successfully"
}
```

### Client Settings

#### List Client Settings
```http
GET /api/settings/client
GET /api/settings/client?clientId=client-123  # Filter by client
```

#### Create Client Setting
```http
POST /api/settings/client
Content-Type: application/json

{
  "clientId": "client-123",
  "settingKey": "max_users",
  "settingValue": 50,
  "description": "Client override"
}
```

**Permissions Required**: `clientSettings.write`

#### Get Client Setting by ID
```http
GET /api/settings/client/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "organizationId": "507f191e810c19729de860ea",
  "clientId": "client-123",
  "settingKey": "max_users",
  "settingValue": 50,
  "description": "Client override",
  "createdBy": "api-user",
  "createdAt": "2025-11-18T19:00:00.000Z",
  "updatedAt": "2025-11-18T19:00:00.000Z"
}
```

#### Update Client Setting
```http
PUT /api/settings/client/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "settingValue": 75
}
```

#### Delete Client Setting
```http
DELETE /api/settings/client/507f1f77bcf86cd799439011
```

### User Settings

#### List User Settings
```http
GET /api/settings/user
GET /api/settings/user?userId=user-456  # Filter by user
```

#### Create User Setting
```http
POST /api/settings/user
Content-Type: application/json

{
  "userId": "user-456",
  "settingKey": "theme",
  "settingValue": "dark",
  "description": "User preference"
}
```

**Permissions Required**: `userSettings.write`

#### Get User Setting by ID
```http
GET /api/settings/user/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "organizationId": "507f191e810c19729de860ea",
  "userId": "user-456",
  "settingKey": "theme",
  "settingValue": "dark",
  "description": "User preference",
  "createdBy": "api-user",
  "createdAt": "2025-11-18T19:00:00.000Z",
  "updatedAt": "2025-11-18T19:00:00.000Z"
}
```

#### Update User Setting
```http
PUT /api/settings/user/507f1f77bcf86cd799439011
```

#### Delete User Setting
```http
DELETE /api/settings/user/507f1f77bcf86cd799439011
```

### Dynamic Settings

#### List Dynamic Settings
```http
GET /api/settings/dynamic
GET /api/settings/dynamic?uniqueId=session-abc  # Filter by unique ID
```

#### Create Dynamic Setting
```http
POST /api/settings/dynamic
Content-Type: application/json

{
  "uniqueId": "session-abc",
  "settingKey": "timeout",
  "settingValue": 3600,
  "description": "Session timeout"
}
```

**Permissions Required**: `dynamicSettings.write`

#### Get Dynamic Setting by ID
```http
GET /api/settings/dynamic/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "organizationId": "507f191e810c19729de860ea",
  "uniqueId": "session-abc",
  "settingKey": "timeout",
  "settingValue": 3600,
  "description": "Session timeout",
  "createdBy": "api-user",
  "createdAt": "2025-11-18T19:00:00.000Z",
  "updatedAt": "2025-11-18T19:00:00.000Z"
}
```

#### Update Dynamic Setting
```http
PUT /api/settings/dynamic/507f1f77bcf86cd799439011
```

#### Delete Dynamic Setting
```http
DELETE /api/settings/dynamic/507f1f77bcf86cd799439011
```

---

## 🎯 Usage Examples

### CLI Usage
```bash
# Configure CLI
npm run cli
Choose: c (configure)
Bearer Token: demo-token-123
Organization ID: 507f1f77bcf86cd799439011
Auth Name: default

# Now all operations use external API
Choose: 5 (List Global Settings)
Choose: 6 (Create Global Setting)
```

### cURL Usage
```bash
# Set variables
TOKEN="demo-token-123"
ORG_ID="507f1f77bcf86cd799439011"
AUTH_NAME="default"

# List settings
curl -X GET "http://localhost:3000/api/settings/global" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  -H "X-Auth-Name: $AUTH_NAME"

# Create setting
curl -X POST "http://localhost:3000/api/settings/global" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  -H "X-Auth-Name: $AUTH_NAME" \
  -H "Content-Type: application/json" \
  -d '{
    "settingKey": "feature_flag",
    "settingValue": true,
    "description": "Enable new feature"
  }'
```

### JavaScript/Node.js Usage
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': 'Bearer demo-token-123',
    'X-Organization-Id': '507f1f77bcf86cd799439011',
    'X-Auth-Name': 'default'
  }
});

// List settings
const settings = await client.get('/settings/global');

// Create setting
await client.post('/settings/global', {
  settingKey: 'max_connections',
  settingValue: 1000,
  description: 'Max DB connections'
});

// Update setting
await client.put('/settings/global/507f1f77bcf86cd799439011', {
  settingValue: 2000
});

// Delete setting
await client.delete('/settings/global/507f1f77bcf86cd799439011');
```

---

## 🔒 Permissions

DynamicAuth configs return permissions that control access:

```javascript
{
  "ok": true,
  "permissions": {
    "globalSettings": { "read": true, "write": true },
    "clientSettings": { "read": true, "write": false },
    "userSettings": { "read": true, "write": true },
    "dynamicSettings": { "read": false, "write": false }
  }
}
```

Operations check permissions before execution:
- **List**: Requires `read` permission
- **Create**: Requires `write` permission
- **Update**: Requires `write` permission
- **Delete**: Requires `write` permission

Missing permissions return `403 Forbidden`.

---

## ⚡ Performance

- **DynamicAuth**: Results cached (default 300s)
- **HTTP Auth**: External service calls cached
- **JS Auth**: Evaluated and cached
- Cache can be invalidated via internal API

---

## 🎯 When to Use Which API

### Use Internal API (`/api/internal/*`) when:
- Building web UI
- Need session management
- User login/logout required
- Managing organizations and auth configs

### Use External API (`/api/*`) when:
- Building CLI tools
- External application integration
- Automation scripts
- API-to-API communication
- Stateless operations
- Bearer token authentication

---

**See also**:
- [CLI-README.md](CLI-README.md) - CLI tool documentation
- [SETTINGS-CASCADE.md](SETTINGS-CASCADE.md) - Cascade resolution
- [idea.md](idea.md) - Original architecture design
