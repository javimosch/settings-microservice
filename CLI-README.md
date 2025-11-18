# Settings Microservice CLI

Interactive command-line interface for testing and interacting with the Settings Microservice.

## 🚀 Quick Start

```bash
# Start the CLI
npm run cli

# Or with custom URL
node cli.js --url http://localhost:3000

# With pre-configured bearer token
node cli.js --token my-secret-token --org 507f1f77bcf86cd799439011
```

## ✨ Features

- 🔐 **Session Authentication** - Login and use session cookies
- 🎯 **Bearer Token Support** - Test DynamicAuth with custom tokens
- 📋 **Full CRUD Operations** - All entity types supported
- 🎨 **Colored Output** - Easy-to-read terminal interface
- 🔄 **Interactive Prompts** - Step-by-step guided operations
- 📊 **Request/Response Display** - See exactly what's sent and received

## 📋 Supported Operations

### Organizations
- List all organizations
- Create organization
- Update organization
- Delete organization

### Global Settings
- List global settings
- Create global setting (with value type selection)
- Update global setting
- Delete global setting
- **Get setting via External API** (tests DynamicAuth!)

### Client Settings
- List client settings
- Create client setting
- Update client setting
- Delete client setting

### User Settings
- List user settings
- Create user setting
- Update user setting
- Delete user setting

### Dynamic Settings
- List dynamic settings
- Create dynamic setting
- Update dynamic setting
- Delete dynamic setting

### Dynamic Auth
- List auth configurations
- Create auth config (HTTP or JS)
- Update auth config
- Delete auth config
- **Test auth config** - Interactive tester
- **Invalidate cache** - Clear cached auth results

## 🎯 Usage Examples

### 1. Basic Workflow

```bash
# Start the CLI
npm run cli

# Login to get session
l
Username: admin
Password: admin123

# List organizations
1

# Create an organization
2
Organization name: Test Org

# Configure for external API testing
c
Bearer Token: demo-token-123
Organization ID: 507f1f77bcf86cd799439011
Auth Name: default

# Test external API
9
Setting Key: max_users
User ID: user-123
Client ID: client-abc
```

### 2. Testing DynamicAuth

```bash
# Start CLI
npm run cli

# Login
l

# Create a JS auth config
23
Organization ID: 507f1f77bcf86cd799439011
Auth Name: test-auth
Type: js
Enabled? y
Cache TTL: 300
Description: Test auth
# Enter JS code:
const token = req.headers.authorization?.split(' ')[1];
if (token === 'valid-token') {
  return { ok: true, subject: { id: 'user-1' } };
}
return { ok: false };
# (empty line to finish)

# Test the auth config
26
DynamicAuth ID: <id-from-creation>
Authorization header value: Bearer valid-token

# Now test external API with this token
c
Bearer Token: valid-token
Organization ID: 507f1f77bcf86cd799439011
Auth Name: test-auth

9
Setting Key: theme
```

### 3. Create Settings with Different Types

```bash
# String value
6
Organization ID: 507f1f77bcf86cd799439011
Setting Key: app_name
Value Type: string
Setting Value: My Application
Description: Application name

# Number value
6
Organization ID: 507f1f77bcf86cd799439011
Setting Key: max_users
Value Type: number
Setting Value: 100
Description: Maximum users

# Boolean value
6
Organization ID: 507f1f77bcf86cd799439011
Setting Key: feature_enabled
Value Type: boolean
Setting Value: true
Description: Feature flag

# JSON value
6
Organization ID: 507f1f77bcf86cd799439011
Setting Key: config
Value Type: json
Setting Value: {"theme":"dark","language":"en"}
Description: User preferences
```

## 📖 Menu Options

```
📋 ORGANIZATIONS
  1. List Organizations
  2. Create Organization
  3. Update Organization
  4. Delete Organization

⚙️  GLOBAL SETTINGS
  5. List Global Settings
  6. Create Global Setting
  7. Update Global Setting
  8. Delete Global Setting
  9. Get Global Setting (External API)

👥 CLIENT SETTINGS
  10-13. CRUD operations

👤 USER SETTINGS
  14-17. CRUD operations

🔄 DYNAMIC SETTINGS
  18-21. CRUD operations

🔐 DYNAMIC AUTH
  22. List DynamicAuth Configs
  23. Create DynamicAuth Config
  24. Update DynamicAuth Config
  25. Delete DynamicAuth Config
  26. Test DynamicAuth Config
  27. Invalidate Auth Cache

🔧 CONFIGURATION
  c. Set Bearer Token & Org ID
  l. Login (get session)
  s. Show current config
  q. Quit
```

## 🎨 Output Format

The CLI provides color-coded output:

- **Cyan**: Headers and titles
- **Yellow**: Section labels
- **Green**: Success messages
- **Red**: Error messages
- **Blue**: Information
- **Dim**: Request/response details

### Example Output

```
→ POST http://localhost:3000/api/internal/organizations
Headers: {
  "Content-Type": "application/json",
  "Cookie": "connect.sid=..."
}
Body: {
  "name": "Test Org"
}

← Status: 201 Created
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Test Org",
  "createdAt": "2025-11-18T19:00:00.000Z"
}
```

## ⚙️ Command Line Options

```bash
# Custom base URL
node cli.js --url http://api.example.com:8080

# Pre-configure bearer token
node cli.js --token my-secret-token

# Pre-configure organization ID
node cli.js --org 507f1f77bcf86cd799439011

# Pre-configure auth name
node cli.js --auth custom-auth

# Combine options
node cli.js --url http://localhost:3000 --token demo-token --org 507f1f77bcf86cd799439011
```

## 🔍 Tips

1. **Use Login First**: Run option `l` to get a session for internal APIs
2. **Set Bearer Token**: Use option `c` to configure bearer token for external API testing
3. **Test DynamicAuth**: Create auth configs and test them with option `26` before using
4. **Save IDs**: Keep organization and setting IDs handy for updates/deletes
5. **Value Types**: When creating settings, choose the correct value type
6. **External API**: Option `9` demonstrates the cascade resolution feature
7. **View Config**: Use `s` anytime to see current configuration

## 🐛 Troubleshooting

### "Session expired" or "Not authenticated"
- Run option `l` to login again

### "Organization ID required"
- Use option `c` to set organization ID
- Or provide it when prompted

### "DynamicAuth failed"
- Check bearer token is correct
- Verify auth config is enabled
- Test auth config with option `26` first

### Connection refused
- Ensure server is running: `npm start`
- Check the base URL is correct

## 📝 Notes

- The CLI uses the same APIs as the web UI
- Internal APIs require session authentication (login)
- External APIs use DynamicAuth (bearer token)
- All operations show request/response details
- Press Ctrl+C or use `q` to exit

## 🚀 Advanced Usage

### Scripting

You can pipe inputs to automate operations:

```bash
# Create organization and settings
echo -e "l\nadmin\nadmin123\n2\nTest Org\nq" | node cli.js
```

### Integration Testing

Use the CLI in test scripts:

```bash
#!/bin/bash
# test-script.sh

# Start CLI and perform operations
node cli.js << EOF
l
admin
admin123
1
q
EOF
```

## 🎯 Example Session

```
$ npm run cli

🚀 Welcome to Settings Microservice CLI!

=== Current Configuration ===
Base URL: http://localhost:3000
Session: not set
Bearer Token: not set
Organization ID: not set
Auth Name: default

┌─────────────────────────────────────────┐
│     Settings Microservice CLI          │
└─────────────────────────────────────────┘

Choose an option: l

=== Login ===
Username [admin]: admin
Password [admin123]: 
✓ Login successful!
Session: s%3A...

Choose an option: 1

→ GET http://localhost:3000/api/internal/organizations

← Status: 200 OK
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "My Organization",
    "createdAt": "2025-11-18T19:00:00.000Z"
  }
]

Choose an option: q
Goodbye! 👋
```

---

**Enjoy testing your Settings Microservice!** 🎉
