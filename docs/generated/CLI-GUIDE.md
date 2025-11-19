# 🎯 CLI Quick Start Guide

## Installation Complete ✅

The interactive CLI tool is ready to use!

## 🚀 Start Using It Now

```bash
# Simple start
npm run cli

# With options
node cli.js --url http://localhost:3000 --token demo-token-123
```

## 📖 Quick Tutorial

### Step 1: Login
```
Choose an option: l
Username: admin
Password: admin123
✓ Login successful!
```

### Step 2: Create Organization
```
Choose an option: 2
Organization name: My Test Org
```

### Step 3: Configure Bearer Token
```
Choose an option: c
Bearer Token: demo-token-123
Organization ID: <paste-org-id-here>
Auth Name: default
```

### Step 4: Create a Setting
```
Choose an option: 6
Organization ID [<current>]: (press enter)
Setting Key: max_users
Value Type: number
Setting Value: 100
Description: Maximum allowed users
```

### Step 5: Test External API (Tests DynamicAuth!)
```
Choose an option: 9
Setting Key: max_users
User ID: (optional)
Client ID: (optional)
```

## 🎨 What You'll See

```
→ GET http://localhost:3000/api/global-settings/max_users
Headers: {
  "Authorization": "Bearer demo-token-123",
  "X-Organization-Id": "...",
  "X-Auth-Name": "default"
}

← Status: 200 OK
{
  "source": "global",
  "value": 100,
  "setting": { ... }
}
```

## ⚡ Power Features

### Test DynamicAuth Configs
```
# Create auth config (option 23)
# Test it (option 26)  
# Use it in external API calls
```

### Value Type Support
- **String**: Text values
- **Number**: Numeric values
- **Boolean**: true/false
- **JSON**: Complex objects

### Cascade Testing
Create settings at different levels and test resolution:
```
1. Create Global: max_users = 100
2. Create Client: max_users = 50 (for client-123)
3. Create User: max_users = 10 (for user-456)
4. Query with user+client → returns 10
5. Query with client only → returns 50
6. Query with neither → returns 100
```

## 🔍 All 27 Operations

| # | Operation | Description |
|---|-----------|-------------|
| 1-4 | Organizations | Full CRUD |
| 5-9 | Global Settings | CRUD + External API |
| 10-13 | Client Settings | Full CRUD |
| 14-17 | User Settings | Full CRUD |
| 18-21 | Dynamic Settings | Full CRUD |
| 22-27 | DynamicAuth | CRUD + Test + Cache |
| c | Configure | Set token, org, auth |
| l | Login | Get session |
| s | Show | Display config |
| q | Quit | Exit CLI |

## 💡 Pro Tips

1. **Login First** - Use `l` before internal API operations
2. **Save IDs** - Keep organization and setting IDs handy
3. **Test Auth** - Always test auth configs (option 26) before deploying
4. **Use Config** - Set bearer token once with `c`, use many times
5. **External API** - Option 9 demonstrates cascade resolution perfectly

## 📝 Common Workflows

### Workflow 1: Setup New Organization
```
l → 2 → 6 → 6 → 6 → 23 → c → 9
(Login, Create Org, Add 3 Settings, Create Auth, Configure, Test)
```

### Workflow 2: Test Cascade Resolution
```
6 → 11 → 15 → 9
(Create Global, Create Client, Create User, Query External)
```

### Workflow 3: DynamicAuth Development
```
23 → 26 → 24 → 26 → c → 9
(Create, Test, Update, Test, Configure, Use)
```

## 🎯 Example Session

```bash
$ npm run cli

🚀 Welcome to Settings Microservice CLI!

┌─────────────────────────────────────────┐
│     Settings Microservice CLI          │
└─────────────────────────────────────────┘

Choose an option: l
Username: admin
Password: admin123
✓ Login successful!

Choose an option: 2
Organization name: Demo Corp
✓ Organization created: 507f1f77bcf86cd799439011

Choose an option: c
Bearer Token: demo-token-123
Organization ID: 507f1f77bcf86cd799439011
Auth Name: default
✓ Configuration updated

Choose an option: 6
Organization ID [507f1f77bcf86cd799439011]: 
Setting Key: theme
Value Type: string
Setting Value: dark
Description: UI theme preference
✓ Setting created

Choose an option: 9
Setting Key: theme
← Status: 200 OK
{
  "source": "global",
  "value": "dark",
  "setting": { ... }
}

Choose an option: q
Goodbye! 👋
```

## 🐛 Need Help?

- Press `s` to see current configuration
- Read [CLI-README.md](CLI-README.md) for full documentation
- Check server is running: `npm start`
- Verify URLs and tokens are correct

---

**Ready to test!** Type `npm run cli` and start exploring! 🚀
