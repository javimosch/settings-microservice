# Settings Microservice - Complete Implementation

## 🎯 Project Overview

A production-ready, multi-tenant settings microservice built with Node.js, Express, MongoDB, and EJS. Features dynamic authentication, three-tier settings hierarchy, and intelligent cascade resolution.

**Status**: ✅ Sprint 1 (POC) Complete - Ready for deployment and testing

## 📦 What's Included

### Core Features
- ✅ Multi-tenant organization management
- ✅ Three-tier settings (Global/Client/User) + Dynamic settings
- ✅ Cascade resolution (User → Client → Global)
- ✅ DynamicAuth system (HTTP + JavaScript based)
- ✅ Internal admin UI with session authentication
- ✅ External REST API with dynamic authentication
- ✅ LRU caching for performance
- ✅ Secure JS sandboxing with vm2
- ✅ MongoDB persistence with proper indexing
- ✅ Comprehensive logging with Winston

### Security
- ✅ Helmet security headers
- ✅ Rate limiting
- ✅ CORS support
- ✅ Session encryption
- ✅ HTTP-only cookies
- ✅ Input validation
- ✅ Sandboxed code execution

## 🚀 Quick Start

### 1. Installation
```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
```

### 2. Start MongoDB
```bash
# Local
mongod

# Or Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. Start Server
```bash
npm start
# Or for development:
npm run dev
```

### 4. Access
- **UI**: http://localhost:3000
- **Login**: admin / admin123

### 5. Run Tests
```bash
# Automated test suite
./test.sh

# Full demo
./demo.sh
```

## 📚 Documentation

| File | Description |
|------|-------------|
| [README.md](README.md) | Project overview and features |
| [QUICKSTART.md](QUICKSTART.md) | Detailed setup guide |
| [API.md](API.md) | Complete API documentation |
| [SETTINGS-CASCADE.md](SETTINGS-CASCADE.md) | Cascade resolution explained |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Implementation details |
| [idea.md](idea.md) | Original specification |

## 🏗️ Architecture

### Project Structure
```
settings-microservice/
├── src/
│   ├── controllers/    # Business logic handlers
│   ├── middleware/     # Auth and request processing
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routes
│   ├── utils/          # Helpers (logger, cache, db)
│   ├── views/          # EJS templates
│   └── server.js       # Application entry
├── examples/           # Configuration examples
├── demo.sh            # Automated demo
├── test.sh            # Test suite
└── docs/              # Documentation
```

### Data Models
1. **Organization** - Multi-tenant container
2. **GlobalSetting** - Organization-wide settings
3. **ClientSetting** - Client-specific overrides
4. **UserSetting** - User-specific overrides
5. **DynamicSetting** - Custom ID-based settings
6. **DynamicAuth** - Authentication configurations

### API Structure
- `/api/internal/*` - Admin UI APIs (session auth)
- `/api/*` - External APIs (dynamic auth)

## 💡 Key Concepts

### Settings Cascade
```
Request: GET /api/global-settings/theme?userId=123&clientId=abc

Resolution Order:
1. UserSetting(userId=123, key=theme)     → Found? Return
2. ClientSetting(clientId=abc, key=theme) → Found? Return
3. GlobalSetting(key=theme)               → Found? Return
4. Not Found                              → 404
```

### DynamicAuth Types

**HTTP Type** - Call external auth service:
```json
{
  "type": "http",
  "http": {
    "url": "https://auth.example.com/validate",
    "method": "POST",
    "headers": { "Authorization": "{{headers.authorization}}" }
  }
}
```

**JS Type** - Execute sandboxed code:
```json
{
  "type": "js",
  "jsCode": "const token = req.headers.authorization; if (token === 'valid') { return { ok: true, permissions: {...} }; } return { ok: false };"
}
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/settings-microservice
SESSION_SECRET=your-secret-key
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=admin123
NODE_ENV=development
```

## 📊 API Examples

### Create Organization
```bash
curl -X POST http://localhost:3000/api/internal/organizations \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Org"}'
```

### Create Setting
```bash
curl -X POST http://localhost:3000/api/internal/global-settings \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "<org-id>",
    "settingKey": "max_users",
    "settingValue": 100
  }'
```

### Query Setting (External API)
```bash
curl -X GET "http://localhost:3000/api/global-settings/max_users?userId=123" \
  -H "Authorization: Bearer <token>" \
  -H "X-Organization-Id: <org-id>" \
  -H "X-Auth-Name: default"
```

## 🧪 Testing

### Automated Tests
```bash
./test.sh
```
Tests cover:
- Server health
- Authentication
- CRUD operations
- External API
- DynamicAuth
- Caching

### Manual Demo
```bash
./demo.sh
```
Demonstrates:
- Full workflow
- All setting types
- Cascade resolution
- DynamicAuth configuration

## 🔒 Security Checklist

For production deployment:

- [ ] Change default admin credentials
- [ ] Use strong SESSION_SECRET
- [ ] Enable MongoDB authentication
- [ ] Configure CORS for specific origins
- [ ] Set secure: true for cookies (HTTPS)
- [ ] Implement IP whitelisting if needed
- [ ] Review rate limits
- [ ] Enable audit logging
- [ ] Use environment-specific configs
- [ ] Regular security updates

## 📈 Scaling Considerations

Current implementation uses:
- In-memory LRU cache (single instance)
- MongoDB session store

For production scale:
- Replace LRU with Redis (multi-instance support)
- Use Redis for session store
- Implement worker pools for JS execution
- Add load balancer
- Enable health checks
- Add monitoring and metrics

See [idea.md](idea.md) Sprints 4-5 for details.

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check MongoDB is running
mongod --version

# Verify connection string in .env
MONGODB_URI=mongodb://localhost:27017/settings-microservice
```

### Port 3000 Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill

# Or change PORT in .env
PORT=3001
```

### Session Issues
```bash
# Clear browser cookies
# Verify SESSION_SECRET is set
# Check MongoDB session collection
```

### DynamicAuth Not Working
```bash
# Test auth config with /try endpoint
curl -X POST http://localhost:3000/api/internal/dynamicauth/<id>/try \
  -H "Cookie: connect.sid=<session>" \
  -d '{"headers": {"authorization": "Bearer test"}}'

# Check logs
tail -f combined.log
```

## 📝 Next Steps

1. **Immediate**: Run `./test.sh` to verify installation
2. **Explore**: Run `./demo.sh` to see full capabilities
3. **Integrate**: Use API.md to integrate with your apps
4. **Customize**: Add custom DynamicAuth configurations
5. **Extend**: Build additional UI pages for settings management

## 🛣️ Roadmap

### ✅ Completed (Sprint 1)
- Core data models
- Authentication system
- Settings CRUD
- DynamicAuth POC
- Basic UI
- Documentation

### 🔜 Planned (Sprints 2-5)
- Enhanced DynamicAuth UI
- Redis caching
- Worker pools for JS
- Audit trails
- Advanced permissions
- Containerized sandbox
- Health checks
- Metrics/monitoring

## 📞 Support

For issues or questions:
1. Check [QUICKSTART.md](QUICKSTART.md)
2. Review [API.md](API.md)
3. Run `./test.sh` for diagnostics
4. Check logs in `combined.log` and `error.log`

## 📄 License

ISC

---

**Built with**: Node.js, Express, MongoDB, Mongoose, EJS, TailwindCSS, Alpine.js, vm2, Winston

**Version**: 1.0.0 (Sprint 1 - POC Complete)
