# Dynamic Auth JavaScript Function - JWT Support

## Overview

The dynamic auth middleware now supports JWT-based authentication through JavaScript code execution. Two helper functions are automatically available in the VM sandbox:

- `decodeJWT(token)` - Decodes a JWT token and returns the parsed payload
- `getClientUserIfValid(token)` - Validates a token's expiration and returns a user identifier

## Helper Functions

### atob(str)

Pure base64 decoder function automatically available in the sandbox.

**Parameters:**
- `str` (string): Base64 encoded string

**Returns:**
- Decoded string

**Example:**
```javascript
const encodedPayload = "eyJjbGllbnQiOiJwaXp6b3JubyIsInVzZXIiOiJhbGFuIn0=";
const decoded = atob(encodedPayload);
// decoded = '{"client":"pizzorno","user":"alan"}'
```

### decodeJWT(jwt)

Decodes a JWT token by extracting and parsing the payload (second segment).

**Parameters:**
- `jwt` (string): The JWT token (format: `header.payload.signature`)

**Returns:**
- Parsed payload object on success
- `null` if JWT is invalid or malformed

**Example:**
```javascript
const token = req.headers.authorization?.split(' ')[1];
const decoded = decodeJWT(token);
// decoded = { client: 'pizzorno', user: 'alan', exp: 1234567890, ... }
// decoded = null if invalid
```

### getClientUserIfValid(token)

Validates that a token object has a valid (non-expired) `exp` field and returns a formatted user identifier.

**Parameters:**
- `token` (object): The decoded JWT token object

**Returns:**
- User identifier string in format `{client}_{user}` if token is valid
- `null` if token is null, missing exp field, or expired

**Example:**
```javascript
const userId = getClientUserIfValid(decoded);
// userId = 'pizzorno_alan' (valid)
// userId = null (expired or invalid)
```

## Complete Example

This example demonstrates the recommended pattern for JWT authentication with permission filtering:

```javascript
const token = req.headers.authorization?.split(' ')[1];
const decoded = decodeJWT(token);
const userId = getClientUserIfValid(decoded);

if (!!userId) {
  return {
    ok: true,
    subject: { 
      id: userId, 
      type: 'api-key' 
    },
    permissions: {
      // Goal 1: Alan can read global settings
      globalSettings: {
        read: true,
        write: false
      },
      // Goal 2: Alan can read/write own settings (userSettings)
      userSettings: {
        read: { filter: { userId: userId } },
        write: { filter: { userId: userId } }
      }
    }
  };
}

return { ok: false };
```

## Response Format

The JavaScript code should return an object with the following structure:

```javascript
{
  ok: true|false,
  subject: {
    id: string,           // User identifier (e.g., 'pizzorno_alan')
    type: string          // Subject type (e.g., 'api-key', 'user')
  },
  permissions: {
    // Define permissions for each resource type
    globalSettings: {
      read: boolean,
      write: boolean
    },
    userSettings: {
      read: { filter: { userId: string } },
      write: { filter: { userId: string } }
    }
  },
  ttl?: number           // Optional: Cache TTL in seconds (defaults to cacheTTLSeconds)
}
```

## Available Sandbox Context

Within the JavaScript code, you have access to:

- `req.headers` - Request headers object
- `req.query` - Query parameters
- `req.body` - Request body
- `req.ip` - Client IP address
- `req.path` - Request path
- `axios` - HTTP client for making external requests
- `atob(str)` - Pure base64 decoder function
- `decodeJWT()` - JWT decoding helper
- `getClientUserIfValid()` - Token validation helper

## JWT Token Structure

Expected JWT format with expiration validation:

```javascript
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "client": "pizzorno",
  "user": "alan",
  "exp": 1763594139,    // Unix timestamp (required for validation)
  // ... other claims
}

Signature: <base64>
```

## Error Handling

The middleware automatically handles:

- Invalid or malformed JWTs → `decodeJWT()` returns `null`
- Expired tokens → `getClientUserIfValid()` returns `null`
- Authentication failures → Middleware returns 401 status
- Uncaught errors → Middleware returns 500 status with error details

## Example Database Config

Create a DynamicAuth record with the following jsCode:

```javascript
const authConfig = {
  organizationId: "org123",
  name: "jwt-auth",
  type: "js",
  jsCode: `
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = decodeJWT(token);
    const userId = getClientUserIfValid(decoded);

    if (!!userId) {
      return {
        ok: true,
        subject: { id: userId, type: 'api-key' },
        permissions: {
          globalSettings: { read: true, write: false },
          userSettings: {
            read: { filter: { userId: userId } },
            write: { filter: { userId: userId } }
          }
        }
      };
    }
    return { ok: false };
  `,
  cacheTTLSeconds: 60,
  enabled: true
};
```

## Request Example

```bash
curl -H "Authorization: Bearer eyJhbGc..." \
     -H "X-Organization-Id: org123" \
     -H "X-Auth-Name: jwt-auth" \
     http://localhost:3006/api/settings/global
```
