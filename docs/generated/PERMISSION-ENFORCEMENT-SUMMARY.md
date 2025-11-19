# Permission Enforcement Implementation - Summary

## Problem

The dynamic auth JWT permissions were not being enforced in the external API endpoints. While the JWT could return permissions with filter-based constraints like:

```javascript
userSettings: {
  read: { filter: { userId: 'pizzorno_alan' } },
  write: { filter: { userId: 'pizzorno_alan' } }
}
```

These filters were not actually being applied to the API calls, allowing unauthorized access.

## Solution

Implemented comprehensive permission enforcement across all API endpoints for user settings (and other resource types). The implementation includes:

### 1. New Utility Functions (src/utils/permissionFilters.js)

**`applyDynamicPermissionFilter(baseQuery, permissions, resourceType, action)`**
- Adds filter constraints to MongoDB queries
- Used in list operations to filter at database level
- Merges permission filters with existing query conditions
- Returns modified query with filter applied

**`hasPermission(permissions, resourceType, action)`**
- Checks if an action permission exists
- Supports both boolean (true/false) and filter-based permissions
- Returns true if any form of permission is granted

**`checkFilteredAccess(resource, permissions, resourceType, action)`**
- Verifies a specific resource matches all filter conditions
- Used for single-record operations (get, create, update, delete)
- Enforces filter constraints at application level

### 2. API Endpoint Updates (src/controllers/apiController.js)

**Read Operations (GET):**
- `GET /api/settings/user` - Filters list by read permission filter
- `GET /api/settings/user/:id` - Checks access before returning
- `GET /user-settings/:userId/:settingKey` - Enforces read filter
- `GET /user-settings/:settingKey?userId=...` - Enforces read filter
- `GET /user-settings/all/:userId` - Filters results by permission
- Cascade resolution respects read permissions

**Write Operations (POST/PUT):**
- `POST /api/settings/user` - Enforces write filter before creating
- `PUT /api/settings/user/:id` - Enforces write filter before updating
- Checks both permission existence and filter-based constraints

**Delete Operations:**
- `DELETE /api/settings/user/:id` - Enforces write filter before deleting

### 3. How It Works

**For List Operations:**
```javascript
// User JWT with filter: { userId: 'pizzorno_alan' }
const filteredQuery = applyDynamicPermissionFilter(
  { organizationId: '123' },
  permissions,
  'userSettings',
  'read'
);
// Result: { organizationId: '123', userId: 'pizzorno_alan' }
// Only settings for pizzorno_alan are returned from database
```

**For Single Record Operations:**
```javascript
// Get a setting and verify user has access
const setting = await UserSetting.findOne({ _id: settingId });
if (!checkFilteredAccess(setting, permissions, 'userSettings', 'read')) {
  return 403; // Access denied
}
return setting;
```

**For Create/Update/Delete:**
```javascript
// 1. Check if action permission exists
if (!hasPermission(permissions, 'userSettings', 'write')) {
  return 403;
}

// 2. Check if the resource matches filter constraints
const resource = { userId, settingKey, settingValue };
if (!checkFilteredAccess(resource, permissions, 'userSettings', 'write')) {
  return 403;
}

// Create/update/delete allowed
```

## Permission Formats Supported

### Boolean Permissions (Legacy - Still Supported)
```javascript
{
  globalSettings: { read: true, write: false }
}
```

### Filter-Based Permissions (Dynamic Auth)
```javascript
{
  userSettings: {
    read: { filter: { userId: 'pizzorno_alan' } },
    write: { filter: { userId: 'pizzorno_alan' } }
  }
}
```

### Mixed Permissions
```javascript
{
  globalSettings: { read: true, write: false },        // Boolean
  userSettings: {
    read: { filter: { userId: 'pizzorno_alan' } },     // Filter-based
    write: { filter: { userId: 'pizzorno_alan' } }
  }
}
```

## Example: User Can Only Manage Own Settings

### JWT Auth Code
```javascript
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
```

### API Behavior

**Create Setting (Own User)**
```bash
curl -X POST /api/settings/user \
  -H "Authorization: Bearer <JWT>" \
  -d '{ "userId": "pizzorno_alan", "settingKey": "theme", ... }'
# ✓ 201 Created
```

**Create Setting (Different User)**
```bash
curl -X POST /api/settings/user \
  -H "Authorization: Bearer <JWT>" \
  -d '{ "userId": "other_user", "settingKey": "theme", ... }'
# ✗ 403 Forbidden (filter doesn't match)
```

**List Own Settings**
```bash
curl -X GET /api/settings/user?userId=pizzorno_alan \
  -H "Authorization: Bearer <JWT>"
# ✓ 200 OK (returns own settings)
```

**List Other User's Settings**
```bash
curl -X GET /api/settings/user?userId=other_user \
  -H "Authorization: Bearer <JWT>"
# ✓ 200 OK (but returns empty list due to filter)
```

## Security Features

1. **Multi-Layer Enforcement**
   - Query-level filtering for list operations
   - Record-level verification for individual operations

2. **No Bypass**
   - Even if users guess a setting ID, they cannot access it without matching filters
   - Filters are checked before ANY operation

3. **Least Privilege**
   - Default is to deny access unless explicitly permitted
   - Multiple filter conditions must ALL match

4. **Backwards Compatible**
   - Existing boolean permissions continue to work
   - No breaking changes to existing code

## Testing

All functionality has been verified with integration tests covering:
- ✓ Filter-based read permissions
- ✓ Filter-based write permissions  
- ✓ Boolean permissions (legacy format)
- ✓ Mixed permission formats
- ✓ Multiple filter conditions
- ✓ List operations with filtering
- ✓ Single record access checks
- ✓ Create/update/delete enforcement

## Files Modified

1. **src/utils/permissionFilters.js** - Added 3 new utility functions
2. **src/controllers/apiController.js** - Updated user settings endpoints with permission enforcement

## Documentation

- `JWT-AUTH-EXAMPLE.md` - JWT auth helper functions documentation
- `PERMISSION-ENFORCEMENT.md` - Comprehensive permission enforcement guide
