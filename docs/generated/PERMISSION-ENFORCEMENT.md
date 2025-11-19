# Permission Enforcement in Dynamic Auth

## Overview

The dynamic auth middleware now fully enforces permissions throughout all API endpoints. Permissions with filter-based constraints (e.g., `{ filter: { userId: 'pizzorno_alan' } }`) are now applied to all read, create, update, and delete operations.

## Permission Format

### Boolean Permissions (Legacy)
```javascript
{
  globalSettings: {
    read: true,
    write: false
  }
}
```

### Filter-Based Permissions (Dynamic Auth)
```javascript
{
  globalSettings: {
    read: true,      // Can read all
    write: false     // Cannot write any
  },
  userSettings: {
    read: { filter: { userId: 'pizzorno_alan' } },     // Can only read own settings
    write: { filter: { userId: 'pizzorno_alan' } }     // Can only write own settings
  }
}
```

## How Permissions Are Enforced

### 1. Read Operations

**Single Record Retrieval** (GET endpoints):
```javascript
// GET /api/settings/user/:id
// GET /user-settings/:userId/:settingKey
// GET /user-settings/:settingKey?userId=...

// Permission check:
// - If permission has filter { userId: 'pizzorno_alan' }
// - The setting's userId must match 'pizzorno_alan'
// - Otherwise returns 403 Forbidden
```

**List Operations** (GET endpoints returning multiple records):
```javascript
// GET /api/settings/user
// GET /user-settings/all/:userId

// Permission filter is automatically added to the database query:
// Before: { organizationId: 'org123', userId: 'bob' }
// After:  { organizationId: 'org123', userId: 'bob', userId: 'pizzorno_alan' }
// Result: Only settings where userId='pizzorno_alan' are returned
```

### 2. Write Operations (Create/Update)

```javascript
// POST/PUT /api/settings/user

// Two checks are performed:

// 1. Permission exists check
if (!hasPermission(permissions, 'userSettings', 'write')) {
  return 403; // No write permission at all
}

// 2. Filter-based access check  
if (!checkFilteredAccess(resource, permissions, 'userSettings', 'write')) {
  return 403; // Filter doesn't match (e.g., trying to create/update for different userId)
}
```

### 3. Delete Operations

Same as Write operations - both permission existence and filter-based access are verified.

## Examples

### Example 1: User Can Only Manage Own Settings

JWT Returns:
```javascript
{
  ok: true,
  subject: { id: 'pizzorno_alan', type: 'api-key' },
  permissions: {
    globalSettings: {
      read: true,
      write: false
    },
    userSettings: {
      read: { filter: { userId: 'pizzorno_alan' } },
      write: { filter: { userId: 'pizzorno_alan' } }
    }
  }
}
```

API Behavior:
```
✓ GET /api/settings/user?userId=pizzorno_alan
  → Returns only settings for pizzorno_alan

✗ GET /api/settings/user?userId=other_user
  → Returns 403 Forbidden (filter doesn't match)

✓ POST /api/settings/user 
  { userId: 'pizzorno_alan', ... }
  → Creates successfully

✗ POST /api/settings/user
  { userId: 'other_user', ... }
  → Returns 403 Forbidden (filter doesn't match)

✓ DELETE /api/settings/user/:id
  (if the setting's userId is pizzorno_alan)
  → Deletes successfully

✗ DELETE /api/settings/user/:id
  (if the setting's userId is other_user)
  → Returns 403 Forbidden (filter doesn't match)
```

### Example 2: Admin Can Read All But Write Restricted

```javascript
{
  ok: true,
  subject: { id: 'admin_user', type: 'api-key' },
  permissions: {
    globalSettings: {
      read: true,
      write: true
    },
    userSettings: {
      read: true,  // Can read all (no filter)
      write: { filter: { status: 'staging' } }  // Can only write staging settings
    }
  }
}
```

API Behavior:
```
✓ GET /api/settings/user
  → Returns ALL user settings (no filter)

✓ GET /api/settings/user?userId=any_user
  → Returns settings for any user

✓ POST /api/settings/user
  { userId: 'any', status: 'staging', ... }
  → Creates successfully

✗ POST /api/settings/user
  { userId: 'any', status: 'production', ... }
  → Returns 403 Forbidden (status filter doesn't match)
```

## Implementation Details

### New Utility Functions

**`applyDynamicPermissionFilter(baseQuery, permissions, resourceType, action)`**
- Merges filter constraints from permissions into the MongoDB query
- Used for list operations to filter results at database level
- Returns null if access is denied

**`hasPermission(permissions, resourceType, action)`**
- Checks if an action permission exists (true/false or object with filter)
- Returns true if permission exists in any form
- Returns false if no permission is defined

**`checkFilteredAccess(resource, permissions, resourceType, action)`**
- Verifies that a specific resource matches all filter conditions
- Used before returning single records or creating/updating resources
- Checks all fields in the filter object match the resource

### Modified Endpoints

User Settings endpoints now enforce filter-based permissions:
- `GET /api/settings/user` - List filtered by read filter
- `GET /api/settings/user/:id` - Check read filter before returning
- `GET /user-settings/:userId/:settingKey` - Check read filter before returning
- `GET /user-settings/:settingKey?userId=...` - Check read filter before returning
- `GET /user-settings/all/:userId` - Filter results by read filter
- `POST /api/settings/user` - Check write filter before creating
- `PUT /api/settings/user/:id` - Check write filter before updating
- `DELETE /api/settings/user/:id` - Check write filter before deleting

Global Settings endpoints:
- Cascade resolution now respects read permissions

## Testing Permission Enforcement

### Test Case: User Can Only Read/Write Own Settings

```bash
# Setup: Create JWT auth with userId filter
curl -X POST http://localhost:3006/api/dynamic-auth \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org123",
    "name": "jwt-self-only",
    "type": "js",
    "jsCode": "
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
    "
  }'

# Test 1: Create setting as pizzorno_alan
curl -X POST http://localhost:3006/api/settings/user \
  -H "Authorization: Bearer <JWT for pizzorno_alan>" \
  -H "X-Organization-Id: org123" \
  -H "X-Auth-Name: jwt-self-only" \
  -H "Content-Type: application/json" \
  -d '{ "userId": "pizzorno_alan", "settingKey": "theme", "settingValue": "dark" }'
# Expected: 201 Created

# Test 2: Try to create setting as other_user (should fail)
curl -X POST http://localhost:3006/api/settings/user \
  -H "Authorization: Bearer <JWT for pizzorno_alan>" \
  -H "X-Organization-Id: org123" \
  -H "X-Auth-Name: jwt-self-only" \
  -H "Content-Type: application/json" \
  -d '{ "userId": "other_user", "settingKey": "theme", "settingValue": "light" }'
# Expected: 403 Forbidden

# Test 3: List own settings
curl -X GET "http://localhost:3006/api/settings/user?userId=pizzorno_alan" \
  -H "Authorization: Bearer <JWT for pizzorno_alan>" \
  -H "X-Organization-Id: org123" \
  -H "X-Auth-Name: jwt-self-only"
# Expected: 200 OK with own settings

# Test 4: Try to list other user's settings (should fail)
curl -X GET "http://localhost:3006/api/settings/user?userId=other_user" \
  -H "Authorization: Bearer <JWT for pizzorno_alan>" \
  -H "X-Organization-Id: org123" \
  -H "X-Auth-Name: jwt-self-only"
# Expected: 200 OK but with empty array (query filtered)
```

## Backwards Compatibility

The implementation maintains backwards compatibility:
- Boolean permissions (true/false) continue to work as before
- Endpoints that don't use filter-based permissions are unaffected
- Existing permission checks remain functional
- Legacy code using `req.permissions?.userSettings?.write` continues to work

## Security Notes

1. **Filter Enforcement**: Filters are applied both at query level (list operations) and record level (single operations)
2. **No Bypass**: Even if a user guesses a setting ID, they cannot access it without matching filters
3. **Principle of Least Privilege**: Default is to deny access unless explicitly permitted
4. **Multiple Conditions**: Filters support multiple field conditions (all must match)

