# 🚀 START HERE

Welcome to the Settings Microservice! This guide will get you up and running in 5 minutes.

## ✅ Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js v16+ installed (`node --version`)
- [ ] MongoDB running (`mongod --version`)
- [ ] Git installed (optional)

## 🎯 5-Minute Quick Start

### Step 1: Install Dependencies (1 min)
```bash
npm install
```

### Step 2: Configure Environment (30 sec)
```bash
cp .env.example .env
# Edit .env if needed (default works for local MongoDB)
```

### Step 3: Start MongoDB (if not running)
```bash
# Option A: Local MongoDB
mongod

# Option B: Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 4: Start the Server (30 sec)
```bash
npm start
```

You should see:
```
Settings Microservice running on port 3000
Environment: development
MongoDB connected successfully
```

### Step 5: Access the Application (1 min)
1. Open browser: **http://localhost:3000**
2. Login with: **admin** / **admin123**
3. Create an organization
4. Start adding settings!

## 🧪 Verify Everything Works

Run the automated test suite:
```bash
# In a new terminal (keep server running)
./test.sh
```

Expected output: `✓ All tests passed!`

## 📖 See It In Action

Run the complete demo:
```bash
./demo.sh
```

This demonstrates:
- Creating organizations
- Adding settings (Global, Client, User)
- Configuring DynamicAuth
- Testing cascade resolution
- Using external APIs

## 📚 What to Read Next

| Priority | Document | Purpose |
|----------|----------|---------|
| 🔴 HIGH | [OVERVIEW.md](OVERVIEW.md) | Understand the system |
| 🔴 HIGH | [API.md](API.md) | Learn the API |
| 🟡 MEDIUM | [QUICKSTART.md](QUICKSTART.md) | Detailed setup guide |
| 🟡 MEDIUM | [SETTINGS-CASCADE.md](SETTINGS-CASCADE.md) | How cascade works |
| 🟢 LOW | [IMPLEMENTATION.md](IMPLEMENTATION.md) | Implementation details |
| 🟢 LOW | [idea.md](idea.md) | Original specification |

## 🎓 Quick Tutorial

### 1. Create Your First Organization

Via UI:
- Go to http://localhost:3000/dashboard
- Click "+ New Organization"
- Enter name, click Save

Via API:
```bash
# First, get session cookie by logging in
curl -c cookies.txt -X POST http://localhost:3000/login \
  -d "username=admin&password=admin123"

# Create organization
curl -b cookies.txt -X POST http://localhost:3000/api/internal/organizations \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Org"}'
```

### 2. Add a Global Setting

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/internal/global-settings \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "<org-id-from-step-1>",
    "settingKey": "max_connections",
    "settingValue": 100,
    "description": "Maximum concurrent connections"
  }'
```

### 3. Configure DynamicAuth

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/internal/dynamicauth \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "<org-id>",
    "name": "default",
    "type": "js",
    "jsCode": "const token = req.headers.authorization?.split(\" \")[1]; if (token === \"my-secret-token\") { return { ok: true, subject: { id: \"api-user\", type: \"api-key\" }, permissions: { globalSettings: { read: true, write: true } } }; } return { ok: false };",
    "enabled": true
  }'
```

### 4. Query Settings via External API

```bash
curl -X GET "http://localhost:3000/api/global-settings/max_connections" \
  -H "Authorization: Bearer my-secret-token" \
  -H "X-Organization-Id: <org-id>" \
  -H "X-Auth-Name: default"
```

Response:
```json
{
  "source": "global",
  "value": 100,
  "setting": { ... }
}
```

## 🎯 Common Use Cases

### Feature Flags
```javascript
// Global: disabled
{ settingKey: "new_ui", settingValue: false }

// Enable for beta users
{ userId: "beta-user", settingKey: "new_ui", settingValue: true }
```

### Rate Limiting
```javascript
// Global: 100/min
{ settingKey: "rate_limit", settingValue: 100 }

// Premium clients: 1000/min
{ clientId: "premium", settingKey: "rate_limit", settingValue: 1000 }
```

### User Preferences
```javascript
// User theme preference
{ userId: "user-123", settingKey: "theme", settingValue: "dark" }
```

## �� Troubleshooting

### "Cannot connect to MongoDB"
```bash
# Check MongoDB is running
ps aux | grep mongod

# Or start it
mongod
```

### "Port 3000 already in use"
```bash
# Option 1: Kill the process
lsof -ti:3000 | xargs kill

# Option 2: Change port in .env
echo "PORT=3001" >> .env
```

### "Session expired" or "Not authenticated"
```bash
# Clear browser cookies and login again
# Or use fresh curl session
```

## 📊 Project Stats

- **Lines of Code**: ~6,000
- **Files**: 35
- **Models**: 6
- **API Endpoints**: 25+
- **Test Coverage**: 10 automated tests
- **Documentation**: 8 markdown files

## 🤝 Contributing

This is Sprint 1 (POC). Future enhancements planned:
- Enhanced UI for settings management
- Redis caching for multi-instance
- Advanced permission system
- Audit logging
- Health checks & metrics

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for roadmap.

## 💬 Need Help?

1. Check [QUICKSTART.md](QUICKSTART.md) for detailed setup
2. Review [API.md](API.md) for API reference
3. Run `./test.sh` to diagnose issues
4. Check logs: `tail -f combined.log`

## 🎉 You're Ready!

You now have a fully functional settings microservice. Start building!

**Next Steps**:
1. Create your organizations
2. Add your settings
3. Configure auth for your clients
4. Integrate with your applications

Happy coding! 🚀
