#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');
const { program } = require('commander');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

class SettingsCLI {
  constructor(baseUrl, sessionCookie = null, bearerToken = null, orgId = null, authName = 'default') {
    this.baseUrl = baseUrl;
    this.sessionCookie = sessionCookie;
    this.bearerToken = bearerToken;
    this.orgId = orgId;
    this.authName = authName;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async question(query) {
    return new Promise((resolve) => {
      this.rl.question(`${colors.cyan}${query}${colors.reset}`, (answer) => {
        resolve(answer);
      });
    });
  }

  getHeaders(isInternal = false) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (isInternal && this.sessionCookie) {
      headers['Cookie'] = `connect.sid=${this.sessionCookie}`;
    }

    if (!isInternal) {
      if (this.bearerToken) {
        headers['Authorization'] = `Bearer ${this.bearerToken}`;
      }
      if (this.orgId) {
        headers['X-Organization-Id'] = this.orgId;
      }
      if (this.authName) {
        headers['X-Auth-Name'] = this.authName;
      }
    }

    return headers;
  }

  async request(method, endpoint, data = null, isInternal = false) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = this.getHeaders(isInternal);

      this.log(`\n→ ${method} ${url}`, 'dim');
      if (Object.keys(headers).length > 0) {
        this.log(`Headers: ${JSON.stringify(headers, null, 2)}`, 'dim');
      }
      if (data) {
        this.log(`Body: ${JSON.stringify(data, null, 2)}`, 'dim');
      }

      const response = await axios({
        method,
        url,
        headers,
        data,
        validateStatus: () => true
      });

      this.log(`\n← Status: ${response.status} ${response.statusText}`, 
        response.status < 300 ? 'green' : 'red');
      this.log(JSON.stringify(response.data, null, 2), 'bright');
      
      return response.data;
    } catch (error) {
      this.log(`\n✗ Error: ${error.message}`, 'red');
      if (error.response) {
        this.log(JSON.stringify(error.response.data, null, 2), 'red');
      }
      return null;
    }
  }

  async login() {
    this.log('\n=== Login ===', 'yellow');
    const username = await this.question('Username [admin]: ') || 'admin';
    const password = await this.question('Password [admin123]: ') || 'admin123';

    try {
      const response = await axios.post(
        `${this.baseUrl}/login`,
        `username=${username}&password=${password}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          maxRedirects: 0,
          validateStatus: () => true
        }
      );

      const cookie = response.headers['set-cookie']?.[0];
      if (cookie) {
        this.sessionCookie = cookie.split(';')[0].split('=')[1];
        this.log('✓ Login successful!', 'green');
        this.log(`Session: ${this.sessionCookie.substring(0, 20)}...`, 'dim');
        return true;
      } else {
        this.log('✗ Login failed', 'red');
        return false;
      }
    } catch (error) {
      this.log(`✗ Login error: ${error.message}`, 'red');
      return false;
    }
  }

  async setConfig() {
    this.log('\n=== Configuration ===', 'yellow');
    
    const token = await this.question(`Bearer Token [${this.bearerToken || 'none'}]: `);
    if (token) this.bearerToken = token;

    const orgId = await this.question(`Organization ID [${this.orgId || 'none'}]: `);
    if (orgId) this.orgId = orgId;

    const authName = await this.question(`Auth Name [${this.authName}]: `);
    if (authName) this.authName = authName;

    this.log('\n✓ Configuration updated:', 'green');
    this.log(`  Bearer: ${this.bearerToken || 'not set'}`, 'dim');
    this.log(`  Org ID: ${this.orgId || 'not set'}`, 'dim');
    this.log(`  Auth Name: ${this.authName}`, 'dim');
  }

  async showMenu() {
    this.log('\n┌─────────────────────────────────────────┐', 'cyan');
    this.log('│     Settings Microservice CLI          │', 'cyan');
    this.log('└─────────────────────────────────────────┘', 'cyan');
    
    this.log('\n📋 ORGANIZATIONS', 'yellow');
    this.log('  1. List Organizations');
    this.log('  2. Create Organization');
    this.log('  3. Update Organization');
    this.log('  4. Delete Organization');

    this.log('\n⚙️  GLOBAL SETTINGS', 'yellow');
    this.log('  5. List Global Settings');
    this.log('  6. Create Global Setting');
    this.log('  7. Update Global Setting');
    this.log('  8. Delete Global Setting');
    this.log('  9. Get Global Setting (External API)');

    this.log('\n👥 CLIENT SETTINGS', 'yellow');
    this.log('  10. List Client Settings');
    this.log('  11. Create Client Setting');
    this.log('  12. Update Client Setting');
    this.log('  13. Delete Client Setting');

    this.log('\n👤 USER SETTINGS', 'yellow');
    this.log('  14. List User Settings');
    this.log('  15. Create User Setting');
    this.log('  16. Update User Setting');
    this.log('  17. Delete User Setting');

    this.log('\n🔄 DYNAMIC SETTINGS', 'yellow');
    this.log('  18. List Dynamic Settings');
    this.log('  19. Create Dynamic Setting');
    this.log('  20. Update Dynamic Setting');
    this.log('  21. Delete Dynamic Setting');

    this.log('\n🔐 DYNAMIC AUTH', 'yellow');
    this.log('  22. List DynamicAuth Configs');
    this.log('  23. Create DynamicAuth Config');
    this.log('  24. Update DynamicAuth Config');
    this.log('  25. Delete DynamicAuth Config');
    this.log('  26. Test DynamicAuth Config');
    this.log('  27. Invalidate Auth Cache');

    this.log('\n🔧 CONFIGURATION', 'yellow');
    this.log('  c. Set Bearer Token & Org ID');
    this.log('  l. Login (get session)');
    this.log('  s. Show current config');
    this.log('  q. Quit');

    this.log('', 'reset');
  }

  async handleChoice(choice) {
    switch (choice) {
      // Organizations
      case '1':
        await this.request('GET', '/api/internal/organizations', null, true);
        break;
      case '2':
        await this.createOrganization();
        break;
      case '3':
        await this.updateOrganization();
        break;
      case '4':
        await this.deleteOrganization();
        break;

      // Global Settings
      case '5':
        await this.listGlobalSettings();
        break;
      case '6':
        await this.createGlobalSetting();
        break;
      case '7':
        await this.updateGlobalSetting();
        break;
      case '8':
        await this.deleteGlobalSetting();
        break;
      case '9':
        await this.getGlobalSettingExternal();
        break;

      // Client Settings
      case '10':
        await this.listClientSettings();
        break;
      case '11':
        await this.createClientSetting();
        break;
      case '12':
        await this.updateClientSetting();
        break;
      case '13':
        await this.deleteClientSetting();
        break;

      // User Settings
      case '14':
        await this.listUserSettings();
        break;
      case '15':
        await this.createUserSetting();
        break;
      case '16':
        await this.updateUserSetting();
        break;
      case '17':
        await this.deleteUserSetting();
        break;

      // Dynamic Settings
      case '18':
        await this.listDynamicSettings();
        break;
      case '19':
        await this.createDynamicSetting();
        break;
      case '20':
        await this.updateDynamicSetting();
        break;
      case '21':
        await this.deleteDynamicSetting();
        break;

      // DynamicAuth
      case '22':
        await this.listDynamicAuth();
        break;
      case '23':
        await this.createDynamicAuth();
        break;
      case '24':
        await this.updateDynamicAuth();
        break;
      case '25':
        await this.deleteDynamicAuth();
        break;
      case '26':
        await this.testDynamicAuth();
        break;
      case '27':
        await this.invalidateAuthCache();
        break;

      // Config
      case 'c':
        await this.setConfig();
        break;
      case 'l':
        await this.login();
        break;
      case 's':
        this.showConfig();
        break;
      case 'q':
        this.log('\nGoodbye! 👋', 'cyan');
        this.rl.close();
        process.exit(0);
        break;
      default:
        this.log('Invalid choice', 'red');
    }
  }

  showConfig() {
    this.log('\n=== Current Configuration ===', 'yellow');
    this.log(`Base URL: ${this.baseUrl}`, 'bright');
    this.log(`Session: ${this.sessionCookie ? this.sessionCookie.substring(0, 30) + '...' : 'not set'}`, 'dim');
    this.log(`Bearer Token: ${this.bearerToken || 'not set'}`, 'dim');
    this.log(`Organization ID: ${this.orgId || 'not set'}`, 'dim');
    this.log(`Auth Name: ${this.authName}`, 'dim');
  }

  // Organization Methods
  async createOrganization() {
    const name = await this.question('Organization name: ');
    await this.request('POST', '/api/internal/organizations', { name }, true);
  }

  async updateOrganization() {
    const id = await this.question('Organization ID: ');
    const name = await this.question('New name: ');
    await this.request('PUT', `/api/internal/organizations/${id}`, { name }, true);
  }

  async deleteOrganization() {
    const id = await this.question('Organization ID: ');
    await this.request('DELETE', `/api/internal/organizations/${id}`, null, true);
  }

  // Global Settings Methods
  async listGlobalSettings() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    await this.request('GET', `/api/internal/global-settings?organizationId=${orgId}`, null, true);
  }

  async createGlobalSetting() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    const settingKey = await this.question('Setting Key: ');
    const valueType = await this.question('Value Type (string/number/boolean/json) [string]: ') || 'string';
    let settingValue = await this.question('Setting Value: ');
    
    if (valueType === 'number') settingValue = Number(settingValue);
    else if (valueType === 'boolean') settingValue = settingValue === 'true';
    else if (valueType === 'json') settingValue = JSON.parse(settingValue);

    const description = await this.question('Description (optional): ');

    await this.request('POST', '/api/internal/global-settings', {
      organizationId: orgId,
      settingKey,
      settingValue,
      description
    }, true);
  }

  async updateGlobalSetting() {
    const id = await this.question('Setting ID: ');
    const settingKey = await this.question('Setting Key (leave empty to skip): ');
    const settingValue = await this.question('Setting Value (leave empty to skip): ');
    const description = await this.question('Description (leave empty to skip): ');

    const data = {};
    if (settingKey) data.settingKey = settingKey;
    if (settingValue) data.settingValue = settingValue;
    if (description) data.description = description;

    await this.request('PUT', `/api/internal/global-settings/${id}`, data, true);
  }

  async deleteGlobalSetting() {
    const id = await this.question('Setting ID: ');
    await this.request('DELETE', `/api/internal/global-settings/${id}`, null, true);
  }

  async getGlobalSettingExternal() {
    const settingKey = await this.question('Setting Key: ');
    const userId = await this.question('User ID (optional): ');
    const clientId = await this.question('Client ID (optional): ');

    let url = `/api/global-settings/${settingKey}?`;
    if (userId) url += `userId=${userId}&`;
    if (clientId) url += `clientId=${clientId}`;

    await this.request('GET', url, null, false);
  }

  // Client Settings Methods
  async listClientSettings() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    await this.request('GET', `/api/internal/client-settings?organizationId=${orgId}`, null, true);
  }

  async createClientSetting() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    const clientId = await this.question('Client ID: ');
    const settingKey = await this.question('Setting Key: ');
    const settingValue = await this.question('Setting Value: ');
    const description = await this.question('Description (optional): ');

    await this.request('POST', '/api/internal/client-settings', {
      organizationId: orgId,
      clientId,
      settingKey,
      settingValue,
      description
    }, true);
  }

  async updateClientSetting() {
    const id = await this.question('Setting ID: ');
    const settingValue = await this.question('New Setting Value: ');
    const description = await this.question('Description (optional): ');

    const data = { settingValue };
    if (description) data.description = description;

    await this.request('PUT', `/api/internal/client-settings/${id}`, data, true);
  }

  async deleteClientSetting() {
    const id = await this.question('Setting ID: ');
    await this.request('DELETE', `/api/internal/client-settings/${id}`, null, true);
  }

  // User Settings Methods
  async listUserSettings() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    await this.request('GET', `/api/internal/user-settings?organizationId=${orgId}`, null, true);
  }

  async createUserSetting() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    const userId = await this.question('User ID: ');
    const settingKey = await this.question('Setting Key: ');
    const settingValue = await this.question('Setting Value: ');
    const description = await this.question('Description (optional): ');

    await this.request('POST', '/api/internal/user-settings', {
      organizationId: orgId,
      userId,
      settingKey,
      settingValue,
      description
    }, true);
  }

  async updateUserSetting() {
    const id = await this.question('Setting ID: ');
    const settingValue = await this.question('New Setting Value: ');
    const description = await this.question('Description (optional): ');

    const data = { settingValue };
    if (description) data.description = description;

    await this.request('PUT', `/api/internal/user-settings/${id}`, data, true);
  }

  async deleteUserSetting() {
    const id = await this.question('Setting ID: ');
    await this.request('DELETE', `/api/internal/user-settings/${id}`, null, true);
  }

  // Dynamic Settings Methods
  async listDynamicSettings() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    await this.request('GET', `/api/internal/dynamic-settings?organizationId=${orgId}`, null, true);
  }

  async createDynamicSetting() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    const uniqueId = await this.question('Unique ID: ');
    const settingKey = await this.question('Setting Key: ');
    const settingValue = await this.question('Setting Value: ');
    const description = await this.question('Description (optional): ');

    await this.request('POST', '/api/internal/dynamic-settings', {
      organizationId: orgId,
      uniqueId,
      settingKey,
      settingValue,
      description
    }, true);
  }

  async updateDynamicSetting() {
    const id = await this.question('Setting ID: ');
    const settingValue = await this.question('New Setting Value: ');
    const description = await this.question('Description (optional): ');

    const data = { settingValue };
    if (description) data.description = description;

    await this.request('PUT', `/api/internal/dynamic-settings/${id}`, data, true);
  }

  async deleteDynamicSetting() {
    const id = await this.question('Setting ID: ');
    await this.request('DELETE', `/api/internal/dynamic-settings/${id}`, null, true);
  }

  // DynamicAuth Methods
  async listDynamicAuth() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    await this.request('GET', `/api/internal/dynamicauth?organizationId=${orgId}`, null, true);
  }

  async createDynamicAuth() {
    const orgId = await this.question(`Organization ID [${this.orgId}]: `) || this.orgId;
    const name = await this.question('Auth Name: ');
    const type = await this.question('Type (http/js): ');
    const enabled = (await this.question('Enabled? (y/n) [y]: ') || 'y') === 'y';
    const cacheTTL = await this.question('Cache TTL (seconds) [300]: ') || '300';
    const description = await this.question('Description (optional): ');

    const data = {
      organizationId: orgId,
      name,
      type,
      enabled,
      cacheTTLSeconds: Number(cacheTTL),
      description
    };

    if (type === 'http') {
      data.http = {
        url: await this.question('HTTP URL: '),
        method: await this.question('HTTP Method [POST]: ') || 'POST',
        headers: {},
        queryParams: {},
        bodyParams: {}
      };
    } else if (type === 'js') {
      this.log('Enter JavaScript code (end with empty line):', 'yellow');
      let code = '';
      let line;
      while ((line = await this.question('')) !== '') {
        code += line + '\n';
      }
      data.jsCode = code;
    }

    await this.request('POST', '/api/internal/dynamicauth', data, true);
  }

  async updateDynamicAuth() {
    const id = await this.question('DynamicAuth ID: ');
    const enabled = await this.question('Enabled? (y/n/skip) [skip]: ');
    const cacheTTL = await this.question('Cache TTL (leave empty to skip): ');

    const data = {};
    if (enabled === 'y') data.enabled = true;
    else if (enabled === 'n') data.enabled = false;
    if (cacheTTL) data.cacheTTLSeconds = Number(cacheTTL);

    await this.request('PUT', `/api/internal/dynamicauth/${id}`, data, true);
  }

  async deleteDynamicAuth() {
    const id = await this.question('DynamicAuth ID: ');
    await this.request('DELETE', `/api/internal/dynamicauth/${id}`, null, true);
  }

  async testDynamicAuth() {
    const id = await this.question('DynamicAuth ID: ');
    const authHeader = await this.question('Authorization header value: ');

    await this.request('POST', `/api/internal/dynamicauth/${id}/try`, {
      headers: { authorization: authHeader },
      query: {},
      body: {}
    }, true);
  }

  async invalidateAuthCache() {
    const id = await this.question('DynamicAuth ID: ');
    await this.request('POST', `/api/internal/dynamicauth/${id}/invalidate-cache`, null, true);
  }

  async run() {
    this.log('\n🚀 Welcome to Settings Microservice CLI!', 'cyan');
    this.showConfig();

    while (true) {
      await this.showMenu();
      const choice = await this.question('Choose an option: ');
      await this.handleChoice(choice.toLowerCase());
    }
  }
}

// Commander program setup
program
  .name('settings-cli')
  .description('Interactive CLI for Settings Microservice')
  .version('1.0.0')
  .option('-u, --url <url>', 'Base URL', 'http://localhost:3000')
  .option('-t, --token <token>', 'Bearer token')
  .option('-o, --org <orgId>', 'Organization ID')
  .option('-a, --auth <name>', 'Auth name', 'default')
  .action(async (options) => {
    const cli = new SettingsCLI(
      options.url,
      null,
      options.token,
      options.org,
      options.auth
    );
    await cli.run();
  });

program.parse();
