# Demo Script Enhancements

## Overview

The `demo.sh` script has been enhanced to demonstrate the new **permission filter enforcement** feature for dynamic JWT authentication.

## New Demo Steps

### Step 10: Create DynamicAuth with JWT Permission Filters

Creates a JWT-based authentication configuration that validates tokens and returns filter-based permissions. This demonstrates:

- JWT token parsing with `decodeJWT()` helper
- Token expiration validation with `getClientUserIfValid()` helper
- Dynamic permission structure with filter constraints
- User isolation (users can only access their own settings)

**Generated JWT Token:**
- Client: pizzorno
- User: alan
- Expiration: 1 hour from now
- Format: `header.payload.signature`

**Permissions Returned:**
```javascript
{
  globalSettings: { read: true, write: false },
  userSettings: {
    read: { filter: { userId: 'pizzorno_alan' } },
    write: { filter: { userId: 'pizzorno_alan' } }
  }
}
```

### Step 11: Create User Settings for Multiple Users

Creates test data with settings for two different users:
- **pizzorno_alan**: Theme = "dark"
- **other_user**: Theme = "light"

This allows demonstrating that filters actually work to prevent cross-user access.

### Step 12: Demonstrate Permission Filter Enforcement

Six test cases showing the permission filter enforcement in action:

**12a. ✓ pizzorno_alan can READ own settings**
```bash
GET /api/settings/user?userId=pizzorno_alan
Authorization: Bearer <JWT for pizzorno_alan>
Result: Returns 1 setting (own setting)
```

**12b. ✗ pizzorno_alan CANNOT read other user's settings**
```bash
GET /api/settings/user?userId=other_user
Authorization: Bearer <JWT for pizzorno_alan>
Result: Returns 0 settings (query filter prevents access)
```

**12c. ✓ pizzorno_alan can CREATE own settings**
```bash
POST /api/settings/user
{ userId: 'pizzorno_alan', ... }
Result: 201 Created (filter matches)
```

**12d. ✗ pizzorno_alan CANNOT CREATE for other users**
```bash
POST /api/settings/user
{ userId: 'other_user', ... }
Result: 403 Forbidden (filter doesn't match)
```

**12e. ✓ pizzorno_alan can UPDATE own settings**
```bash
PUT /api/settings/user/:id
(where setting belongs to pizzorno_alan)
Result: 200 OK (filter matches)
```

**12f. ✗ pizzorno_alan CANNOT UPDATE other user's settings**
```bash
PUT /api/settings/user/:id
(where setting belongs to other_user)
Result: 403 Forbidden (filter doesn't match)
```

### Step 13: List all settings

Lists all settings created during the demo via the internal API.

## Running the Demo

```bash
# Ensure the server is running
npm start &

# Run the demo script
bash demo.sh
```

The script will:
1. Create a test organization
2. Set up various settings (global, client, user)
3. Create a basic token-based auth
4. Test cascade resolution
5. **NEW:** Create JWT-based auth with permission filters
6. **NEW:** Create test settings for multiple users
7. **NEW:** Demonstrate permission filter enforcement with 6 test cases
8. List all created settings
9. Display a summary with all IDs and tokens

## Output

The demo provides clear visual feedback:
- ✅ Success indicators for operations that should succeed
- ✗ Expected failure indicators for operations that should be blocked
- HTTP Status codes for API responses
- Formatted JSON output (when `jq` is available)

## Features Demonstrated

✓ JWT token generation and validation
✓ Expiration checking
✓ Filter-based permission structure
✓ Multi-layer permission enforcement (query + record level)
✓ Read restrictions via filters
✓ Write restrictions via filters
✓ Error handling for unauthorized access
✓ Cascade resolution with permission checks

## Key Concepts

### Permission Filters

Filter-based permissions restrict access to resources matching specific criteria:

```javascript
userSettings: {
  read: { filter: { userId: 'pizzorno_alan' } },
  write: { filter: { userId: 'pizzorno_alan' } }
}
```

This means:
- **READ**: Only resources where `userId === 'pizzorno_alan'` can be read
- **WRITE**: Only resources where `userId === 'pizzorno_alan'` can be modified

### Multi-Layer Enforcement

The system enforces permissions at two levels:

1. **Query Level (List Operations)**
   - Filter automatically added to MongoDB query
   - Only matching records retrieved from database
   - Performance optimized

2. **Record Level (Single Operations)**
   - Filter checked against specific resource
   - Prevents bypass via direct ID access
   - Additional security layer

## Testing the Demo Output

Expected results when running the demo:

```
Step 12: Demonstrate Permission Filter Enforcement

12a. ✓ pizzorno_alan can READ own settings
Request: GET /api/settings/user?userId=pizzorno_alan
Result: Got 1 settings (expected: 1)
[{ userId: "pizzorno_alan", settingKey: "theme", settingValue: "dark" }]

12b. ✗ pizzorno_alan CANNOT read other user's settings
Request: GET /api/settings/user?userId=other_user
Result: Got 0 settings (expected: 0 due to filter)
[]

12c. ✓ pizzorno_alan can CREATE own settings
Result: language (expected: language)
{ userId: "pizzorno_alan", settingKey: "language", settingValue: "en", ... }

12d. ✗ pizzorno_alan CANNOT CREATE settings for other users
Expected: 403 Forbidden (filter doesn't match)
HTTP Status: 403

12e. ✓ pizzorno_alan can UPDATE own settings
Result: Updated value to 'light' (expected: light)
{ userId: "pizzorno_alan", settingKey: "theme", settingValue: "light", ... }

12f. ✗ pizzorno_alan CANNOT UPDATE other user's settings
Expected: 403 Forbidden (filter doesn't match)
HTTP Status: 403
```

## Integration with Existing Demo

The new steps complement the existing demo:

- **Steps 1-9**: Demonstrate basic features and cascade resolution
- **Steps 10-12**: Demonstrate new JWT and permission filter features
- **Step 13**: Show all created settings in one place

Both parts work together to showcase the complete microservice capabilities.

## Notes

- The JWT token generated in the demo is intentionally simplified for demonstration
- In production, use proper JWT signing with your secret key
- The `decodeJWT()` and `getClientUserIfValid()` functions handle validation
- All permission checks are enforced at the API layer
- The demo uses the same organization for all operations
