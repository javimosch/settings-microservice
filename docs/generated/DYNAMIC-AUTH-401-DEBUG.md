# Dynamic Auth 401 Error - Debug & Solution

## Issue Summary

When testing dynamic auth with ID `691ccaa9c3dba93d77537f4b`, the endpoint returns:
```
401 Unauthorized
{ "error": "Request failed" }
```

## Root Cause Analysis

✅ **JWT is valid and not expired**
❌ **JavaScript code in the dynamic auth config is returning `ok: false`**

The dynamic auth middleware requires the JS code to return an object with `ok: true` and proper authentication structure. If the code doesn't handle the JWT correctly or returns `ok: false`, you get a 401 error.

## Your JWT Details

```javascript
{
  "iss": "simpliciti",
  "user": "jarancibia",
  "client": "Sabatier",
  "iat": 1763584439,
  "exp": 1763595239,
  "application": "georedv3"
}
```

**Status**: ✅ Valid and not expired
**Expected User ID**: `Sabatier_jarancibia`

## Solution: Update Dynamic Auth JS Code

The Dynamic Auth config must have JavaScript that:
1. Extracts the JWT token
2. Decodes it using `decodeJWT()`
3. Validates it using `getClientUserIfValid()`
4. Returns `{ ok: true, ... }` if valid

### Recommended JS Code

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
      globalSettings: { 
        read: true, 
        write: false 
      },
      userSettings: {
        read: { filter: { userId: userId } },
        write: { filter: { userId: userId } }
      }
    },
    ttl: 300
  };
}
return { ok: false };
```

## How to Fix

1. **Access Dynamic Auth Configuration**
   - Go to the Dynamic Auth UI in the application
   - Find config with ID: `691ccaa9c3dba93d77537f4b`

2. **Update the JavaScript Code**
   - Replace the current JS code with the recommended code above
   - Ensure it uses `decodeJWT()` and `getClientUserIfValid()`

3. **Save the Configuration**
   - Click Save/Update

4. **Test Using Try Feature**
   - Go back to the Try feature
   - Use your JWT token in the Authorization header
   - Should now return `{ "success": true, "result": { "ok": true, ... } }`

## Available Helper Functions in Sandbox

### atob(str)
Pure base64 decoder
```javascript
const decoded = atob(base64String);
```

### decodeJWT(jwt)
Extracts and parses JWT payload
```javascript
const decoded = decodeJWT(token);
// Returns: { client: 'Sabatier', user: 'jarancibia', exp: ..., ... }
// Returns: null if invalid format
```

### getClientUserIfValid(token)
Validates token and extracts user ID
```javascript
const userId = getClientUserIfValid(decoded);
// Returns: 'Sabatier_jarancibia' if valid
// Returns: null if expired or invalid
```

## Debugging Steps

If you still get a 401 error after updating, add logging to find the issue:

```javascript
const token = req.headers.authorization?.split(' ')[1];
console.log('1. Token present?', !!token);

const decoded = decodeJWT(token);
console.log('2. Decoded:', decoded);

const userId = getClientUserIfValid(decoded);
console.log('3. UserID:', userId);

// Check the server logs to see which step is failing
```

## Common Issues

### Issue: "atob is not defined"
**Solution**: Use `decodeJWT()` function instead - it handles base64 decoding internally

### Issue: "decodeJWT returns null"
**Cause**: JWT format is invalid (not header.payload.signature)
**Solution**: Check the token format and ensure Authorization header has "Bearer " prefix

### Issue: "getClientUserIfValid returns null"
**Cause**: Token is expired or missing `exp` field
**Solution**: Check token's exp field and ensure it's a future timestamp

### Issue: Returns "ok: false"
**Cause**: Your code is explicitly returning `{ ok: false }`
**Solution**: Check your if/else logic - should return `{ ok: true, ... }` when token is valid

## Enhanced Try Endpoint

The try endpoint has been improved to provide better error messages:

### Before:
```json
{ "error": "Request failed" }
```

### After:
```json
{
  "success": false,
  "result": {
    "error": "Authentication failed",
    "details": null
  }
}
```

Or on success:
```json
{
  "success": true,
  "result": {
    "ok": true,
    "subject": { "id": "Sabatier_jarancibia", "type": "api-key" },
    "permissions": { ... }
  }
}
```

## Expected Success Response

When everything is working correctly:

```json
{
  "success": true,
  "result": {
    "ok": true,
    "subject": {
      "id": "Sabatier_jarancibia",
      "type": "api-key"
    },
    "permissions": {
      "globalSettings": {
        "read": true,
        "write": false
      },
      "userSettings": {
        "read": {
          "filter": { "userId": "Sabatier_jarancibia" }
        },
        "write": {
          "filter": { "userId": "Sabatier_jarancibia" }
        }
      }
    },
    "ttl": 300
  },
  "permissions": {
    "globalSettings": { "read": true, "write": false },
    "userSettings": { ... }
  }
}
```

## Summary

✅ Your JWT token is valid
✅ Helper functions are available in the sandbox
✅ You need to update the Dynamic Auth config JS code
✅ Use the template code provided above
✅ Test with the Try feature to verify

The 401 error will resolve once the JS code correctly validates the JWT and returns the proper auth structure!
