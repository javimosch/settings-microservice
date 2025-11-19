# Quick Start Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or remote)
- npm or yarn

## Installation

1. **Clone and navigate to the project**
   ```bash
   cd settings-microservice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and credentials
   ```

4. **Start MongoDB**
   ```bash
   # If running locally:
   mongod
   # Or use Docker:
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the server**
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

6. **Access the application**
   - UI: http://localhost:3000
   - Login: admin / admin123 (default credentials from .env)

## Quick Test

Run the demo script to see the system in action:

```bash
# Make sure the server is running, then in another terminal:
./demo.sh
```

This will:
- Create an organization
- Add settings at all levels (Global, Client, User)
- Configure DynamicAuth
- Test the cascade resolution
- Demonstrate external API calls

## Project Structure

```
settings-microservice/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── organizationController.js
│   │   ├── settingsController.js
│   │   ├── dynamicAuthController.js
│   │   └── apiController.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js          # Session and basic auth
│   │   └── dynamicAuth.js   # External API auth
│   ├── models/              # Mongoose schemas
│   │   ├── Organization.js
│   │   ├── GlobalSetting.js
│   │   ├── ClientSetting.js
│   │   ├── UserSetting.js
│   │   ├── DynamicSetting.js
│   │   └── DynamicAuth.js
│   ├── routes/              # Route definitions
│   │   ├── internal.js      # Internal UI APIs
│   │   └── api.js          # External client APIs
│   ├── utils/               # Utilities
│   │   ├── logger.js
│   │   ├── database.js
│   │   └── cache.js
│   ├── views/               # EJS templates
│   │   ├── layout.ejs
│   │   └── pages/
│   │       ├── login.ejs
│   │       └── dashboard.ejs
│   └── server.js            # Application entry point
├── examples/                # Example configurations
├── .env.example            # Environment template
├── package.json
├── README.md
├── API.md                  # API documentation
├── SETTINGS-CASCADE.md     # Settings resolution docs
└── demo.sh                 # Demo script

```

## Basic Usage

### 1. Create an Organization

```bash
curl -X POST http://localhost:3000/api/internal/organizations \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Organization"}'
```

### 2. Create a Global Setting

```bash
curl -X POST http://localhost:3000/api/internal/global-settings \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "<org-id>",
    "settingKey": "max_users",
    "settingValue": 100,
    "description": "Maximum users allowed"
  }'
```

### 3. Configure DynamicAuth

```bash
curl -X POST http://localhost:3000/api/internal/dynamicauth \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "<org-id>",
    "name": "default",
    "type": "js",
    "jsCode": "const token = req.headers.authorization?.split(\" \")[1]; if (token === \"my-token\") { return { ok: true, subject: { id: \"user-1\", type: \"api-key\" }, permissions: { globalSettings: { read: true, write: true } } }; } return { ok: false };",
    "cacheTTLSeconds": 300,
    "enabled": true
  }'
```

### 4. Query Settings via External API

```bash
curl -X GET "http://localhost:3000/api/global-settings/max_users" \
  -H "Authorization: Bearer my-token" \
  -H "X-Organization-Id: <org-id>" \
  -H "X-Auth-Name: default"
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when you make changes.

### Environment Variables

Key environment variables in `.env`:

- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `SESSION_SECRET` - Secret for session encryption
- `BASIC_AUTH_USER` - Admin username
- `BASIC_AUTH_PASS` - Admin password
- `NODE_ENV` - Environment (development/production)

### Logging

Logs are written to:
- `combined.log` - All logs
- `error.log` - Error logs only
- Console (in development mode)

## Common Tasks

### View Logs
```bash
tail -f combined.log
```

### Clear Cache (via API)
```bash
curl -X POST http://localhost:3000/api/internal/dynamicauth/<auth-id>/invalidate-cache \
  -H "Cookie: connect.sid=<your-session-cookie>"
```

### Test DynamicAuth
```bash
curl -X POST http://localhost:3000/api/internal/dynamicauth/<auth-id>/try \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "headers": {
      "authorization": "Bearer test-token"
    }
  }'
```

## Next Steps

1. Read [API.md](API.md) for complete API documentation
2. Read [SETTINGS-CASCADE.md](SETTINGS-CASCADE.md) to understand cascade resolution
3. Check [examples/](examples/) for DynamicAuth configuration examples
4. Build your UI pages for managing settings (extend the dashboard)

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- Verify network connectivity

### Session Issues
- Clear browser cookies
- Check `SESSION_SECRET` is set
- Verify MongoDB session store is working

### DynamicAuth Not Working
- Check auth configuration is enabled
- Verify cache TTL settings
- Test with the `/try` endpoint first
- Check logs for errors

### Port Already in Use
- Change `PORT` in `.env`
- Kill process using port 3000: `lsof -ti:3000 | xargs kill`

## Security Considerations

For production deployment:

1. Change default credentials in `.env`
2. Use strong `SESSION_SECRET`
3. Enable HTTPS (set `secure: true` for cookies)
4. Implement rate limiting (already configured)
5. Validate and sanitize all inputs
6. Use IP whitelisting for sensitive endpoints
7. Enable MongoDB authentication
8. Review and restrict CORS settings
9. Implement audit logging
10. Use environment-specific configs

## Production Deployment

See [idea.md](idea.md) for scaling and deployment strategies including:
- Redis for distributed caching
- Worker pools for JS sandbox execution
- Load balancing
- Health checks
- Monitoring and metrics
