# Settings Cascade Resolution

The settings microservice implements a cascade resolution system for retrieving settings.

## Cascade Order (Highest to Lowest Priority)

1. **User Settings** - Specific to a user ID
2. **Client Settings** - Specific to a client ID
3. **Global Settings** - Organization-wide defaults
4. **Dynamic Settings** - Custom unique ID based settings

## How It Works

When you request a setting via the external API:

```bash
GET /api/global-settings/max_users?userId=user-123&clientId=client-456
```

The system checks in this order:

1. **User Setting**: Does user-123 have a specific `max_users` setting?
   - If YES → Return this value with source="user"
   - If NO → Continue to next level

2. **Client Setting**: Does client-456 have a specific `max_users` setting?
   - If YES → Return this value with source="client"
   - If NO → Continue to next level

3. **Global Setting**: Does the organization have a global `max_users` setting?
   - If YES → Return this value with source="global"
   - If NO → Return 404 Not Found

## Example Scenario

### Setup:
```javascript
// Global setting for organization
{
  organizationId: "org-1",
  settingKey: "max_users",
  settingValue: 1000,
  description: "Default max users"
}

// Client-specific override
{
  organizationId: "org-1",
  clientId: "premium-client",
  settingKey: "max_users",
  settingValue: 5000,
  description: "Premium tier gets more users"
}

// User-specific override
{
  organizationId: "org-1",
  userId: "admin-user",
  settingKey: "max_users",
  settingValue: 10000,
  description: "Admin gets unlimited (well, 10k)"
}
```

### Query Results:

**Query 1**: Regular user, no client
```bash
GET /api/global-settings/max_users
Response: { source: "global", value: 1000 }
```

**Query 2**: Premium client
```bash
GET /api/global-settings/max_users?clientId=premium-client
Response: { source: "client", value: 5000 }
```

**Query 3**: Admin user (even with premium client)
```bash
GET /api/global-settings/max_users?userId=admin-user&clientId=premium-client
Response: { source: "user", value: 10000 }
```

**Query 4**: Regular user on premium client
```bash
GET /api/global-settings/max_users?userId=regular-user&clientId=premium-client
Response: { source: "client", value: 5000 }
```

## Use Cases

### 1. Feature Flags
```javascript
// Global: Feature disabled by default
{ settingKey: "new_dashboard", settingValue: false }

// Enable for specific clients (beta testers)
{ clientId: "beta-client", settingKey: "new_dashboard", settingValue: true }

// Enable for specific users (internal team)
{ userId: "dev-user-1", settingKey: "new_dashboard", settingValue: true }
```

### 2. Rate Limiting
```javascript
// Global: 100 requests/min
{ settingKey: "rate_limit", settingValue: 100 }

// Premium clients: 1000 requests/min
{ clientId: "premium", settingKey: "rate_limit", settingValue: 1000 }

// Admin users: unlimited (9999)
{ userId: "admin", settingKey: "rate_limit", settingValue: 9999 }
```

### 3. UI Customization
```javascript
// Global: Default theme
{ settingKey: "theme", settingValue: "light" }

// User preference: Dark theme
{ userId: "user-123", settingKey: "theme", settingValue: "dark" }
```

### 4. Resource Limits
```javascript
// Global: 10 GB storage
{ settingKey: "storage_gb", settingValue: 10 }

// Enterprise client: 1000 GB
{ clientId: "enterprise", settingKey: "storage_gb", settingValue: 1000 }
```

## API Response Format

```javascript
{
  "source": "user" | "client" | "global",
  "value": <any-type>,
  "setting": {
    "_id": "...",
    "organizationId": "...",
    "settingKey": "...",
    "settingValue": <value>,
    "description": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Best Practices

1. **Set sensible global defaults** - Always have a global setting as the final fallback
2. **Use client settings for tier-based features** - Different plans/tiers can have different limits
3. **Use user settings for preferences** - Personal customizations that override everything else
4. **Document your settings** - Use the description field to explain what each setting does
5. **Version your settings** - Consider including version info in the setting key (e.g., "api_v2_rate_limit")

## Dynamic Settings

Dynamic settings work differently - they use a `uniqueId` instead of following the cascade:

```bash
GET /api/dynamic-settings/feature-flag-123/enabled
```

This is useful for:
- Feature flags with specific IDs
- A/B test configurations
- Temporary overrides
- Custom business logic settings
