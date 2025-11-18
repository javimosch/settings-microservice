// Example DynamicAuth configurations

// 1. Simple API Key Validation
const simpleApiKey = {
  organizationId: "your-org-id",
  name: "api-key-auth",
  type: "js",
  jsCode: `
    const apiKey = req.headers['x-api-key'];
    const validKeys = {
      'key-123': { userId: 'user-1', permissions: { globalSettings: { read: true, write: true } } },
      'key-456': { userId: 'user-2', permissions: { globalSettings: { read: true, write: false } } }
    };
    
    const keyData = validKeys[apiKey];
    if (keyData) {
      return {
        ok: true,
        subject: { id: keyData.userId, type: 'api-key' },
        permissions: keyData.permissions,
        ttl: 600
      };
    }
    return { ok: false, error: 'Invalid API key' };
  `,
  cacheTTLSeconds: 600,
  enabled: true
};

module.exports = { simpleApiKey };
