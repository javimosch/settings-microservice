# Quick Reference: Permission Filters & JWT Auth

## JWT Auth Helper Functions

Available in dynamic auth JavaScript sandbox:

### atob(str)
```javascript
const decoded = atob(encodedBase64String);
// Returns: String decoded from base64
```

### decodeJWT(jwt)
```javascript
const token = req.headers.authorization?.split(' ')[1];
const decoded = decodeJWT(token);
// Returns: { client: 'pizzorno', user: 'alan', exp: 1234567890 }
// Returns: null if invalid
```

### getClientUserIfValid(token)
```javascript
const userId = getClientUserIfValid(decoded);
// Returns: 'pizzorno_alan' if valid (non-expired)
// Returns: null if expired or invalid
```

## Permission Filter Format

### Read-only Permission
```javascript
userSettings: {
  read: { filter: { userId: 'pizzorno_alan' } },
  write: false
}
```
Effect: User can only read settings where userId='pizzorno_alan'

### Read & Write Permission
```javascript
userSettings: {
  read: { filter: { userId: 'pizzorno_alan' } },
  write: { filter: { userId: 'pizzorno_alan' } }
}
```
Effect: User can read AND write only their own settings

### Multiple Conditions
```javascript
userSettings: {
  read: { filter: { userId: 'alan', status: 'active' } },
  write: { filter: { userId: 'alan', status: 'active' } }
}
```
Effect: ALL conditions must match (userId AND status)

### Boolean (Legacy)
```javascript
globalSettings: {
  read: true,
  write: false
}
```
Effect: Can read all global settings, cannot write any

## API Endpoints with Permission Enforcement

| Endpoint | Method | Enforced |
|----------|--------|----------|
| /api/settings/user | GET | ✓ Read filter |
| /api/settings/user/:id | GET | ✓ Read filter |
| /user-settings/:userId/:settingKey | GET | ✓ Read filter |
| /api/settings/user | POST | ✓ Write filter |
| /api/settings/user/:id | PUT | ✓ Write filter |
| /api/settings/user/:id | DELETE | ✓ Write filter |

## Permission Enforcement Logic

### List Operations (GET /api/settings/user)
```
1. User has permission? → Check filter
2. Add filter to query: { userId: 'pizzorno_alan' }
3. Query database with filter
4. Return only matching results
```

### Single Record Operations (GET /api/settings/user/:id)
```
1. Get record from database
2. Check: Does record match filter?
3. Yes → Return record
4. No → Return 403 Forbidden
```

### Write Operations (POST/PUT/DELETE)
```
1. Does permission exist? → Check hasPermission()
2. Does resource match filter? → Check checkFilteredAccess()
3. All checks pass → Allow operation
4. Any check fails → Return 403 Forbidden
```

## Complete JWT Auth Example

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

## Running the Demo

```bash
# Start server
npm start &

# Run demo showing permission filters
bash demo.sh
```

Demo Steps 10-13 demonstrate:
- JWT token generation
- Permission filter structure
- 6 test cases with different access patterns
- Query-level and record-level filtering

## Testing Permission Enforcement

### Test 1: User can read own settings
```bash
curl GET /api/settings/user?userId=pizzorno_alan \
  -H "Authorization: Bearer <JWT>"
# Result: ✓ Returns own settings
```

### Test 2: User cannot read other's settings
```bash
curl GET /api/settings/user?userId=other_user \
  -H "Authorization: Bearer <JWT>"
# Result: ✓ Returns empty array (filtered)
```

### Test 3: User can write own settings
```bash
curl POST /api/settings/user \
  -H "Authorization: Bearer <JWT>" \
  -d '{ "userId": "pizzorno_alan", "settingKey": "theme", "settingValue": "dark" }'
# Result: ✓ 201 Created
```

### Test 4: User cannot write other's settings
```bash
curl POST /api/settings/user \
  -H "Authorization: Bearer <JWT>" \
  -d '{ "userId": "other_user", "settingKey": "theme", "settingValue": "light" }'
# Result: ✗ 403 Forbidden
```

## Utility Functions (Internal)

Available in `src/utils/permissionFilters.js`:

### applyDynamicPermissionFilter()
Adds filter constraints to MongoDB queries
```javascript
const filtered = applyDynamicPermissionFilter(
  { organizationId: '123' },
  permissions,
  'userSettings',
  'read'
);
// Returns: { organizationId: '123', userId: 'pizzorno_alan' }
```

### hasPermission()
Checks if permission exists
```javascript
const can = hasPermission(permissions, 'userSettings', 'write');
// Returns: true if permission exists in any form
```

### checkFilteredAccess()
Verifies resource matches filter
```javascript
const allowed = checkFilteredAccess(
  { userId: 'pizzorno_alan' },
  permissions,
  'userSettings',
  'read'
);
// Returns: true if all filter conditions match
```

## Common Permission Patterns

### User Can Only Manage Own Settings
```javascript
permissions: {
  userSettings: {
    read: { filter: { userId: userId } },
    write: { filter: { userId: userId } }
  }
}
```

### Admin Can Read All But Write Only Staging
```javascript
permissions: {
  userSettings: {
    read: true,  // No filter - can read all
    write: { filter: { status: 'staging' } }
  }
}
```

### Multiple Conditions
```javascript
permissions: {
  userSettings: {
    read: { filter: { 
      userId: userId,
      department: 'engineering',
      active: true
    } }
  }
}
```

## Key Security Features

✓ **Query-level filtering** - Efficient database queries
✓ **Record-level verification** - No direct ID bypass
✓ **Principle of least privilege** - Default deny
✓ **Multiple conditions** - All must match
✓ **Backwards compatible** - Boolean permissions still work

## Files to Reference

- `src/utils/permissionFilters.js` - Utility functions
- `src/controllers/apiController.js` - Endpoint enforcement
- `src/middleware/dynamicAuth.js` - JWT helpers
- `demo.sh` - Working examples (Steps 10-13)
- `PERMISSION-ENFORCEMENT.md` - Detailed documentation

