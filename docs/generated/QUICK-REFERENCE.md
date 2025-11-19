# Quick Reference - New Features

## 🆕 Bulk Retrieval Routes

### Get All Settings for a Client
```bash
# CLI
./cli.js
Option: 13
ClientId: client-123

# cURL
curl -X GET http://localhost:3006/api/client-settings/all/client-123 \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: YOUR_ORG_ID" \
  -H "X-Auth-Name: default"
```

### Get All Settings for a User
```bash
# CLI
./cli.js
Option: 20
UserId: user-456

# cURL
curl -X GET http://localhost:3006/api/user-settings/all/user-456 \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: YOUR_ORG_ID" \
  -H "X-Auth-Name: default"
```

### Get All Settings for a Dynamic UniqueId
```bash
# CLI
./cli.js
Option: 27
UniqueId: some-unique-id

# cURL
curl -X GET http://localhost:3006/api/dynamic-settings/all/some-unique-id \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: YOUR_ORG_ID" \
  -H "X-Auth-Name: default"
```

## 📋 CLI Menu (Updated)

```
⚙️  GLOBAL SETTINGS
  5. List Global Settings
  6. Create Global Setting
  7. Update Global Setting
  8. Delete Global Setting
  9. Get Global Setting (External API)

👥 CLIENT SETTINGS
  10. List Client Settings
  11. Get Client Setting by Key
  12. Get Client Setting by ID
  13. Get All Settings for ClientId ⭐ NEW
  14. Create Client Setting
  15. Update Client Setting
  16. Delete Client Setting

👤 USER SETTINGS
  17. List User Settings
  18. Get User Setting by Key
  19. Get User Setting by ID
  20. Get All Settings for UserId ⭐ NEW
  21. Create User Setting
  22. Update User Setting
  23. Delete User Setting

🔄 DYNAMIC SETTINGS
  24. List Dynamic Settings
  25. Get Dynamic Setting by Key
  26. Get Dynamic Setting by ID
  27. Get All Settings for UniqueId ⭐ NEW
  28. Create Dynamic Setting
  29. Update Dynamic Setting
  30. Delete Dynamic Setting

🔐 DYNAMIC AUTH
  31. List DynamicAuth Configs
  32. Create DynamicAuth Config
  33. Update DynamicAuth Config
  34. Delete DynamicAuth Config
  35. Test DynamicAuth Config
  36. Invalidate Auth Cache
```

## 🎯 Use Cases

### Scenario 1: Get all settings for a specific client
```javascript
// Useful when you need to see all settings configured for a client
// Returns array of all settings (all keys) for that clientId

const response = await fetch(
  'http://localhost:3006/api/client-settings/all/client-123',
  {
    headers: {
      'Authorization': 'Bearer demo-token-123',
      'X-Organization-Id': orgId,
      'X-Auth-Name': 'default'
    }
  }
);
// Returns: [{ settingKey: 'max_users', settingValue: 50, ... }, ...]
```

### Scenario 2: Get all settings for a specific user
```javascript
// Useful for user preference pages, dashboards, etc.
// Returns all user-specific overrides

const response = await fetch(
  'http://localhost:3006/api/user-settings/all/user-456',
  {
    headers: {
      'Authorization': 'Bearer demo-token-123',
      'X-Organization-Id': orgId,
      'X-Auth-Name': 'default'
    }
  }
);
// Returns: [{ settingKey: 'theme', settingValue: 'dark', ... }, ...]
```

### Scenario 3: Export/backup all settings for an entity
```bash
# Export all client settings for backup
curl -X GET http://localhost:3006/api/client-settings/all/client-123 \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: $ORG_ID" \
  -H "X-Auth-Name: default" > client-123-backup.json
```

## ✅ Testing Checklist

- [ ] CSP errors gone from browser console
- [ ] Can access dashboard without errors
- [ ] Option 13 works in CLI (get all client settings)
- [ ] Option 20 works in CLI (get all user settings)
- [ ] Option 27 works in CLI (get all dynamic settings)
- [ ] cURL requests return valid JSON arrays
- [ ] Empty arrays returned for non-existent IDs
- [ ] Auth headers required (401 without them)
- [ ] Organization ID required (400 without it)

## 🐛 Troubleshooting

### CSP Error in Browser
✅ **Fixed**: Helmet removed from server.js

### 404 on new routes
Check route order in `src/routes/api.js`:
- `/all/:id` routes must come before `/:id/:key` routes
- Most specific routes first

### Empty results
Verify:
- Correct organizationId in header
- Entity (client/user/uniqueId) exists
- At least one setting created for that entity

### CLI not showing options 13, 20, 27
- Make sure you're using updated cli.js
- Restart CLI if already running

## 📚 Related Documentation

- See `API-ROUTES.md` for complete API reference
- See `FIXES-APPLIED.md` for implementation details
- See `IMPLEMENTATION-STATUS.md` for overall status
- Run `./test-new-features.sh` for automated tests
