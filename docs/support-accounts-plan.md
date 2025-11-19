# Support Accounts Plan

## Overview

This document outlines the plan for implementing non-admin support account access to the Settings Microservice UI. Support teams need flexible access control with varying levels of permissions based on organizational scope, feature access, and resource-level constraints.

## Current State

### Authentication & Authorization
- **Authentication**: Basic Auth + Session-based authentication
- **Authorization**: Single admin account with full access to all resources
- **Session Management**: Express sessions with `req.session.authenticated` flag
- **Middleware**: `basicAuth` and `sessionAuth` in `src/middleware/auth.js`

### Current Limitations
- No role-based access control (RBAC)
- No organization-scoped access
- No feature-level permissions
- No resource-level (clientId, userId) restrictions
- Single username/password for all admin users

## Requirements

### Access Level Types

#### 1. Single Organization Access
**Use Case**: Support agent assigned to specific customer organization
- **Scope**: Limited to one organization's resources
- **Permissions**: Full CRUD on all settings within assigned organization
- **Example**: Support agent for Org "Acme Corp" (orgId: 123)

#### 2. All Organizations Access (Admin-like)
**Use Case**: Senior support engineer or platform administrator
- **Scope**: Access to all organizations
- **Permissions**: Full CRUD on all settings across all organizations
- **Example**: Platform admin with cross-org visibility

#### 3. Single Organization with Feature Restrictions
**Use Case**: Limited support agent with reduced capabilities
- **Scope**: One organization with specific feature access
- **Permissions**: 
  - Allowed: Client Settings (Global/Dynamic Settings only)
  - Denied: Dynamic Auth feature management
  - Denied: User Settings, Organization management
- **Example**: Junior support agent who can only view/modify basic client settings

#### 4. Single Organization with Feature + Resource Scope
**Use Case**: Client-specific support agent
- **Scope**: One organization, specific feature, specific resource
- **Permissions**:
  - Allowed: Client Settings for specific clientId(s)
  - Example: Access to clientId 74 settings only
  - Denied: All other clients, users, and features

#### 5. Self-Service User Settings Access
**Use Case**: End user managing their own settings
- **Scope**: Single user's settings only (their own userId)
- **Permissions**:
  - Allowed: User Settings for their specific userId only
  - Denied: All other features and resources
- **Example**: Alan (userId: "74_alan") can only edit his own user settings

#### 6. Client Support Team with User Management
**Use Case**: Support team for a specific client who needs to manage client settings and all users belonging to that client
- **Scope**: Single organization, specific clientId, and userId pattern matching
- **Permissions**:
  - Allowed: Client Settings for specific clientId
  - Allowed: User Settings for userIds matching client pattern (prefix/suffix/contains)
  - Example: Luke manages client 68 settings and all users with userId containing "68_" or "_68"
- **Note**: Supports pattern-based userId filtering since user settings don't have a separate client field

#### 7. All Organizations with Feature Restrictions
**Use Case**: Internal developer or lead with broad access but restricted from sensitive features
- **Scope**: All organizations, most features enabled
- **Permissions**:
  - Allowed: All settings (Global, Client, User, Dynamic) across all orgs
  - Denied: Dynamic Auth feature (too technical/sensitive)
- **Example**: Susan (Lead Dev) can manage all settings but cannot modify Dynamic Auth configurations

#### 8. Single Organization Admin with Feature Restrictions
**Use Case**: Division admin or org-level administrator without technical feature access
- **Scope**: Single organization, full settings access
- **Permissions**:
  - Allowed: All settings (Global, Client, User, Dynamic) for assigned org
  - Denied: Dynamic Auth feature (already configured, too technical)
- **Example**: Roberto (Division Admin) manages all settings for org 38 but cannot touch Dynamic Auth

## Proposed Architecture

### 1. User Account Model

```javascript
// Schema: src/models/User.js
{
  username: String (unique),
  password: String (hashed),
  email: String,
  role: {
    type: String,
    enum: ['admin', 'support', 'support_limited', 'support_readonly'],
    default: 'support'
  },
  permissions: {
    // Organization scope
    organizations: {
      type: String,
      enum: ['all', 'specific'],
      default: 'specific'
    },
    organizationIds: [ObjectId], // Empty = all if organizations='all'
    
    // Feature-level permissions
    features: {
      globalSettings: { read: Boolean, write: Boolean },
      clientSettings: { read: Boolean, write: Boolean },
      userSettings: { read: Boolean, write: Boolean },
      dynamicSettings: { read: Boolean, write: Boolean },
      dynamicAuth: { read: Boolean, write: Boolean },
      organizations: { read: Boolean, write: Boolean }
    },
    
    // Resource-level constraints
    resourceConstraints: {
      clientIds: [String], // Empty = all clients within org scope
      userIds: [String],   // Empty = all users within org scope
      
      // Pattern-based userId filtering (for client-scoped user settings)
      userIdPatterns: [{
        pattern: String,      // Pattern to match (e.g., "68_", "_68", "74_alan")
        matchType: {
          type: String,
          enum: ['exact', 'prefix', 'suffix', 'contains', 'regex'],
          default: 'exact'
        }
      }]
    }
  },
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  active: Boolean
}
```

### 2. Authentication Flow Updates

```
Current Flow:
1. Basic Auth Header → Validate against single ENV credentials
2. Create session with authenticated=true
3. Session middleware checks authenticated flag

New Flow:
1. Login form → POST /login with username/password
2. Validate against User model (bcrypt password comparison)
3. Create session with:
   - authenticated: true
   - userId: user._id
   - username: user.username
   - role: user.role
   - permissions: user.permissions
4. Session middleware checks authenticated flag
5. New permission middleware checks feature/resource access
```

### 3. Authorization Middleware

#### Permission Middleware Chain
```javascript
// src/middleware/permissions.js

// Check organization access
const requireOrgAccess = (req, res, next) => {
  const { orgId } = req.params;
  const userPermissions = req.session.permissions;
  
  if (userPermissions.organizations === 'all') {
    return next();
  }
  
  if (userPermissions.organizationIds.includes(orgId)) {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied to this organization' });
};

// Check feature access
const requireFeature = (feature, action = 'read') => {
  return (req, res, next) => {
    const userPermissions = req.session.permissions;
    
    if (!userPermissions.features[feature]) {
      return res.status(403).json({ error: `Feature ${feature} not available` });
    }
    
    if (!userPermissions.features[feature][action]) {
      return res.status(403).json({ error: `${action} access denied for ${feature}` });
    }
    
    return next();
  };
};

// Check resource-level access (clientId)
const requireClientAccess = (req, res, next) => {
  const { clientId } = req.params;
  const constraints = req.session.permissions.resourceConstraints;
  
  // No constraints = all clients allowed
  if (!constraints.clientIds || constraints.clientIds.length === 0) {
    return next();
  }
  
  if (constraints.clientIds.includes(clientId)) {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied to this client' });
};

// Check resource-level access (userId)
const requireUserAccess = (req, res, next) => {
  const { userId } = req.params;
  const constraints = req.session.permissions.resourceConstraints;
  
  // No constraints = all users allowed
  if ((!constraints.userIds || constraints.userIds.length === 0) &&
      (!constraints.userIdPatterns || constraints.userIdPatterns.length === 0)) {
    return next();
  }
  
  // Check exact userId matches
  if (constraints.userIds && constraints.userIds.includes(userId)) {
    return next();
  }
  
  // Check pattern matches
  if (constraints.userIdPatterns && constraints.userIdPatterns.length > 0) {
    for (const patternRule of constraints.userIdPatterns) {
      let matches = false;
      
      switch (patternRule.matchType) {
        case 'exact':
          matches = userId === patternRule.pattern;
          break;
        case 'prefix':
          matches = userId.startsWith(patternRule.pattern);
          break;
        case 'suffix':
          matches = userId.endsWith(patternRule.pattern);
          break;
        case 'contains':
          matches = userId.includes(patternRule.pattern);
          break;
        case 'regex':
          matches = new RegExp(patternRule.pattern).test(userId);
          break;
      }
      
      if (matches) {
        return next();
      }
    }
  }
  
  return res.status(403).json({ error: 'Access denied to this user' });
};
```

### 4. Route Protection Examples

```javascript
// src/routes/api.js

// Example 1: Global Settings (requires globalSettings feature)
router.get('/api/internal/global-settings/:orgId', 
  sessionAuth,
  requireOrgAccess,
  requireFeature('globalSettings', 'read'),
  settingsController.getGlobalSettings
);

// Example 2: Client Settings (requires clientSettings + client access)
router.post('/api/internal/client-settings/:orgId/:clientId',
  sessionAuth,
  requireOrgAccess,
  requireFeature('clientSettings', 'write'),
  requireClientAccess,
  settingsController.createClientSetting
);

// Example 3: DynamicAuth (requires dynamicAuth feature)
router.post('/api/internal/dynamic-auth/:orgId',
  sessionAuth,
  requireOrgAccess,
  requireFeature('dynamicAuth', 'write'),
  dynamicAuthController.create
);

// Example 4: User Settings (requires userSettings + user access)
router.get('/api/internal/user-settings/:orgId/:userId',
  sessionAuth,
  requireOrgAccess,
  requireFeature('userSettings', 'read'),
  requireUserAccess,
  settingsController.getUserSetting
);
```

### 5. UI Adaptations

#### Navigation Menu Filtering
```javascript
// src/views/partials/nav.ejs
<% if (userPermissions.features.organizations.read) { %>
  <a href="/organizations">Organizations</a>
<% } %>

<% if (userPermissions.features.globalSettings.read) { %>
  <a href="/global-settings">Global Settings</a>
<% } %>

<% if (userPermissions.features.clientSettings.read) { %>
  <a href="/client-settings">Client Settings</a>
<% } %>
```

#### Organization Selector
```javascript
// Show only accessible organizations in dropdown
<% if (userPermissions.organizations === 'all') { %>
  <!-- Show all orgs -->
<% } else { %>
  <!-- Filter by userPermissions.organizationIds -->
<% } %>
```

#### Action Button Visibility
```javascript
// Show/hide Create, Edit, Delete buttons based on write permissions
<% if (userPermissions.features.clientSettings.write) { %>
  <button>Create New Setting</button>
<% } %>
```

## UI Implementation Specification

### Architecture Principles
1. **Modular Approach**: New features in separate files to avoid modifying existing code
2. **Admin-Only Access**: User management accessible only to admin role
3. **Minimal Changes**: Reuse existing dashboard structure and components
4. **Isolated Routes**: User management in dedicated route files

### File Structure

```
src/
├── controllers/
│   ├── organizationController.js      [EXISTING - no changes]
│   ├── settingsController.js          [EXISTING - no changes]
│   ├── dynamicAuthController.js       [EXISTING - no changes]
│   └── userController.js              [NEW - user management CRUD]
│
├── middleware/
│   ├── auth.js                        [MODIFY - add isAdmin check]
│   └── permissions.js                 [NEW - permission middleware]
│
├── models/
│   └── User.js                        [NEW - user schema with permissions]
│
├── routes/
│   ├── internal.js                    [EXISTING - no changes]
│   └── users.js                       [NEW - user management routes]
│
├── views/
│   ├── pages/
│   │   ├── dashboard.ejs              [MODIFY - add Users link if admin]
│   │   ├── login.ejs                  [EXISTING - minor updates]
│   │   ├── settings/
│   │   │   └── index.ejs              [EXISTING - no changes]
│   │   ├── auth/
│   │   │   └── dynamicauth.ejs        [EXISTING - no changes]
│   │   └── users/
│   │       ├── index.ejs              [NEW - user list/CRUD]
│   │       └── edit.ejs               [NEW - permission editor]
│   └── partials/
│       └── nav.ejs                    [NEW - reusable navigation]
│
└── server.js                          [MODIFY - add users route, minimal changes]
```

### 1. New User Controller

**File**: `src/controllers/userController.js`

```javascript
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Render user management page
exports.renderUserManagement = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.render('pages/users/index', {
      title: 'User Management',
      user: req.session.username,
      users
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
};

// API endpoints for AJAX operations
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role, permissions } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
      permissions,
      active: true
    });
    
    await user.save();
    res.json({ message: 'User created successfully', user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // Hash password if provided
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }
    
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
};
```

### 2. New User Routes

**File**: `src/routes/users.js`

```javascript
const express = require('express');
const router = express.Router();
const { sessionAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const userController = require('../controllers/userController');

// All routes require session auth + admin role
router.use(sessionAuth);
router.use(requireAdmin);

// UI route
router.get('/', userController.renderUserManagement);

// API routes
router.get('/api', userController.listUsers);
router.post('/api', userController.createUser);
router.get('/api/:id', userController.getUser);
router.put('/api/:id', userController.updateUser);
router.delete('/api/:id', userController.deleteUser);

module.exports = router;
```

### 3. Server.js Changes (Minimal)

**File**: `src/server.js` (only add these lines)

```javascript
// Add after existing route imports (line ~13)
const userRoutes = require('./routes/users');

// Add after existing route mounting (line ~95)
app.use('/users', userRoutes);
```

**Exact location in server.js:**
```javascript
// Line ~12-14
const internalRoutes = require("./routes/internal");
const apiRoutes = require("./routes/api");
const userRoutes = require("./routes/users");  // ADD THIS LINE

// Line ~94-97
app.use("/api/internal", internalRoutes);
app.use("/api", apiRoutes);
app.use("/users", userRoutes);  // ADD THIS LINE
```

### 4. Auth Middleware Updates

**File**: `src/middleware/auth.js` (add at end of file)

```javascript
// Add this function to existing file
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  return res.redirect('/dashboard');
};

// Update exports
module.exports = { basicAuth, sessionAuth, requireAdmin };
```

### 5. Dashboard Updates (Minimal)

**File**: `src/views/pages/dashboard.ejs`

Add user management card after DynamicAuth card (around line 147):

```html
<!-- Add this block after the DynamicAuth card -->
<% if (typeof userRole !== 'undefined' && userRole === 'admin') { %>
<div class="bg-white rounded-lg shadow p-4 sm:p-6">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
    <h2 class="text-lg sm:text-xl font-semibold">User Management</h2>
    <a href="/users" class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-3 sm:px-4 rounded text-sm sm:text-base w-full sm:w-auto text-center">
      Manage →
    </a>
  </div>
  <p class="text-sm sm:text-base text-gray-600">Manage user accounts and permissions</p>
  <ul class="mt-3 sm:mt-4 space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
    <li>• Create/edit user accounts</li>
    <li>• Configure role-based permissions</li>
    <li>• Manage organization access</li>
    <li>• Set resource-level constraints</li>
  </ul>
</div>
<% } %>
```

### 6. Login Updates

**File**: `src/server.js` (modify login POST handler, line ~65-78)

```javascript
// Replace existing login handler
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  
  // Try database authentication first
  const User = require('./models/User');
  const bcrypt = require('bcrypt');
  
  try {
    const user = await User.findOne({ username, active: true });
    
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.authenticated = true;
      req.session.username = username;
      req.session.userId = user._id;
      req.session.role = user.role;
      req.session.permissions = user.permissions;
      user.lastLogin = new Date();
      await user.save();
      return res.redirect("/dashboard");
    }
  } catch (error) {
    logger.error('Database login error:', error);
  }
  
  // Fallback to ENV credentials (backward compatibility)
  if (
    username === process.env.BASIC_AUTH_USER &&
    password === process.env.BASIC_AUTH_PASS
  ) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.role = 'admin';  // ENV login = admin
    return res.redirect("/dashboard");
  }
  
  res.render("pages/login", { error: "Invalid credentials" });
});
```

**File**: `src/server.js` (update dashboard route, line ~87-93)

```javascript
// Replace existing dashboard handler
app.get("/dashboard", sessionAuth, (req, res) => {
  res.render("pages/dashboard", { 
    user: req.session.username,
    userRole: req.session.role || 'admin'  // Add role to context
  });
});
```

### 7. User Management UI

**File**: `src/views/pages/users/index.ejs`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Management - Settings Microservice</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>
</head>
<body class="bg-gray-100 min-h-screen">
  <%- include('../../partials/nav', { user: user, userRole: 'admin' }) %>

  <div class="max-w-7xl mx-auto py-6 px-4" id="app">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
        <p class="text-gray-600 mt-2">Manage user accounts and permissions</p>
      </div>
      <button 
        @click="openUserForm()"
        class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
      >
        + New User
      </button>
    </div>

    <!-- User List Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Org Access</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user._id">
            <td class="px-6 py-4 font-medium">{{ user.username }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ user.email || '-' }}</td>
            <td class="px-6 py-4">
              <span :class="getRoleBadgeClass(user.role)" class="px-2 py-1 rounded text-xs font-semibold">
                {{ user.role }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm">
              <span v-if="user.permissions.organizations === 'all'" class="text-blue-600">All Orgs</span>
              <span v-else class="text-gray-600">{{ user.permissions.organizationIds.length }} org(s)</span>
            </td>
            <td class="px-6 py-4">
              <span :class="user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" 
                    class="px-2 py-1 rounded text-xs font-semibold">
                {{ user.active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ user.lastLogin ? formatDate(user.lastLogin) : 'Never' }}
            </td>
            <td class="px-6 py-4 text-sm">
              <button @click="editUser(user)" class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
              <button @click="deleteUser(user._id)" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- User Form Modal (simplified - see full implementation for complete form) -->
    <div v-show="showUserForm" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div class="bg-white rounded-lg p-8 max-w-4xl w-full max-h-screen overflow-y-auto">
        <h3 class="text-2xl font-bold mb-6">{{ editingUser ? 'Edit User' : 'New User' }}</h3>
        
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-bold mb-2">Username *</label>
            <input v-model="userForm.username" type="text" required 
                   class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-bold mb-2">Email</label>
            <input v-model="userForm.email" type="email" 
                   class="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <!-- Role Selection -->
        <div class="mb-6">
          <label class="block text-sm font-bold mb-2">Role *</label>
          <select v-model="userForm.role" class="w-full border rounded px-3 py-2">
            <option value="admin">Admin</option>
            <option value="support">Support</option>
            <option value="support_limited">Support Limited</option>
            <option value="support_readonly">Support Read-Only</option>
          </select>
        </div>

        <!-- Quick Permission Templates -->
        <div class="mb-6 p-4 bg-blue-50 rounded">
          <label class="block text-sm font-bold mb-2">Quick Templates</label>
          <div class="grid grid-cols-3 gap-2">
            <button @click="applyTemplate('full_admin')" class="bg-blue-500 text-white px-3 py-2 rounded text-sm">
              Full Admin
            </button>
            <button @click="applyTemplate('org_admin')" class="bg-green-500 text-white px-3 py-2 rounded text-sm">
              Org Admin
            </button>
            <button @click="applyTemplate('support_agent')" class="bg-purple-500 text-white px-3 py-2 rounded text-sm">
              Support Agent
            </button>
          </div>
        </div>

        <!-- Permission Editor (expandable sections) -->
        <!-- See full implementation below -->

        <div class="flex justify-end space-x-3 mt-6">
          <button @click="showUserForm = false" 
                  class="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">
            Cancel
          </button>
          <button @click="saveUser()" 
                  class="bg-purple-500 hover:bg-purple-700 text-white px-4 py-2 rounded">
            Save User
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const { createApp } = Vue;
    // Vue.js implementation here (see full spec)
  </script>
</body>
</html>
```

### 8. Navigation Partial (Reusable)

**File**: `src/views/partials/nav.ejs`

```html
<nav class="bg-white shadow-lg">
  <div class="max-w-7xl mx-auto px-4">
    <div class="flex justify-between h-16">
      <div class="flex items-center space-x-8">
        <a href="/dashboard" class="text-xl font-bold text-gray-800">Settings Microservice</a>
        
        <div class="hidden md:flex space-x-4">
          <a href="/dashboard" class="text-gray-600 hover:text-gray-900">Dashboard</a>
          <a href="/settings" class="text-gray-600 hover:text-gray-900">Settings</a>
          <a href="/dynamicauth" class="text-gray-600 hover:text-gray-900">Dynamic Auth</a>
          <% if (typeof userRole !== 'undefined' && userRole === 'admin') { %>
            <a href="/users" class="text-purple-600 hover:text-purple-900 font-semibold">Users</a>
          <% } %>
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        <% if (typeof user !== 'undefined' && user) { %>
          <span class="text-gray-600">Welcome, <%= user %></span>
          <a href="/logout" class="text-red-600 hover:text-red-800">Logout</a>
        <% } %>
      </div>
    </div>
  </div>
</nav>
```

### Access Control Summary

| Page/Route | Access Level | Middleware |
|------------|--------------|------------|
| `/dashboard` | All authenticated users | `sessionAuth` |
| `/settings` | All authenticated users | `sessionAuth` + feature checks |
| `/dynamicauth` | All authenticated users | `sessionAuth` + feature checks |
| `/users` | **Admin only** | `sessionAuth` + `requireAdmin` |
| `/users/api/*` | **Admin only** | `sessionAuth` + `requireAdmin` |

### Implementation Checklist

**Phase 1: Models & Middleware (Week 1)**
- [ ] Create `src/models/User.js`
- [ ] Create `src/middleware/permissions.js`
- [ ] Update `src/middleware/auth.js` (add `requireAdmin`)
- [ ] Test User model schema validation

**Phase 2: Backend Routes (Week 2)**
- [ ] Create `src/controllers/userController.js`
- [ ] Create `src/routes/users.js`
- [ ] Add 2 lines to `src/server.js` (import + mount route)
- [ ] Update login handler in `src/server.js`
- [ ] Test API endpoints with Postman

**Phase 3: UI Pages (Week 3)**
- [ ] Create `src/views/partials/nav.ejs`
- [ ] Create `src/views/pages/users/index.ejs`
- [ ] Add user management card to dashboard (3 lines)
- [ ] Update dashboard route to pass `userRole`
- [ ] Test UI accessibility (admin vs non-admin)

**Phase 4: Permission Templates (Week 4)**
- [ ] Add permission template presets in UI
- [ ] Add organization selector with filtering
- [ ] Add resource constraint editor
- [ ] Test all 8 use case examples

**Phase 5: Testing & Polish (Week 5)**
- [ ] Create migration script for existing admin
- [ ] Test backward compatibility (ENV login)
- [ ] Write unit tests for permission logic
- [ ] Update documentation

### Migration Script

**File**: `scripts/migrate-admin.js`

```javascript
// One-time migration script to create admin from ENV
const User = require('../src/models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function migrateAdmin() {
  const existing = await User.findOne({ username: process.env.BASIC_AUTH_USER });
  
  if (!existing) {
    const admin = new User({
      username: process.env.BASIC_AUTH_USER,
      password: await bcrypt.hash(process.env.BASIC_AUTH_PASS, 10),
      role: 'admin',
      permissions: {
        organizations: 'all',
        organizationIds: [],
        features: {
          globalSettings: { read: true, write: true },
          clientSettings: { read: true, write: true },
          userSettings: { read: true, write: true },
          dynamicSettings: { read: true, write: true },
          dynamicAuth: { read: true, write: true },
          organizations: { read: true, write: true }
        },
        resourceConstraints: { clientIds: [], userIds: [], userIdPatterns: [] }
      },
      active: true
    });
    
    await admin.save();
    console.log('✓ Admin user created from ENV credentials');
  } else {
    console.log('✓ Admin user already exists');
  }
}

migrateAdmin().catch(console.error);
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. **Create User Model**
   - Define schema with permissions structure
   - Add bcrypt password hashing
   - Create migration script for existing admin account

2. **Update Authentication**
   - Replace Basic Auth with form-based login
   - Create `/login` and `/logout` routes
   - Update session to store user permissions
   - Maintain backward compatibility with ENV credentials

3. **Basic Permission Middleware**
   - Implement `requireOrgAccess`
   - Implement `requireFeature`
   - Implement `requireClientAccess`

### Phase 2: API Protection (Week 2)
1. **Update Internal API Routes**
   - Add permission middleware to all routes
   - Test with different permission combinations
   - Update API error responses for 403 scenarios

2. **Query Filtering**
   - Filter organization lists by user access
   - Filter client/user lists by resource constraints
   - Implement organization-scoped queries
   - Add userId pattern filtering support in controllers
   - Implement client-scoped user listing (pattern-based)

### Phase 3: UI Updates (Week 3)
1. **Login Page**
   - Create login form UI
   - Add session management UI
   - Add "Remember me" functionality (optional)

2. **Navigation Updates**
   - Dynamic menu based on permissions
   - Organization selector with filtered list
   - User profile/logout menu

3. **Page-Level Controls**
   - Hide/show action buttons based on write permissions
   - Display read-only indicators
   - Add permission-denied messages

### Phase 4: User Management (Week 4)
1. **User Management UI**
   - Admin-only user CRUD interface
   - Permission editor with visual controls
   - User activity logs

2. **Predefined Roles**
   - Create role templates
   - Quick role assignment
   - Permission presets for common scenarios

### Phase 5: Testing & Documentation (Week 5)
1. **Testing**
   - Unit tests for permission logic
   - Integration tests for routes
   - E2E tests for UI flows

2. **Documentation**
   - API authentication documentation
   - User management guide
   - Permission configuration examples

## Security Considerations

### Password Security
- Use bcrypt with salt rounds >= 10
- Enforce password complexity requirements
- Implement password reset flow
- Consider 2FA for admin accounts (future)

### Session Security
- Use secure session cookies (httpOnly, secure, sameSite)
- Implement session timeout (30 min inactivity)
- Regenerate session ID on login
- Clear sensitive data on logout

### Audit Logging
- Log all authentication attempts
- Log permission-denied events
- Track user actions (CRUD operations)
- Store logs with user context

### API Security
- Continue using DynamicAuth for external APIs
- Internal APIs remain session-protected
- Rate limiting for login attempts
- CSRF protection for state-changing operations

## Example Configurations

### Example 1: Single Org Support Agent
```json
{
  "username": "support_acme",
  "role": "support",
  "permissions": {
    "organizations": "specific",
    "organizationIds": ["507f1f77bcf86cd799439011"],
    "features": {
      "globalSettings": { "read": true, "write": true },
      "clientSettings": { "read": true, "write": true },
      "userSettings": { "read": true, "write": true },
      "dynamicSettings": { "read": true, "write": true },
      "dynamicAuth": { "read": true, "write": false },
      "organizations": { "read": true, "write": false }
    },
    "resourceConstraints": {
      "clientIds": [],
      "userIds": []
    }
  }
}
```

### Example 2: Admin (All Access)
```json
{
  "username": "admin",
  "role": "admin",
  "permissions": {
    "organizations": "all",
    "organizationIds": [],
    "features": {
      "globalSettings": { "read": true, "write": true },
      "clientSettings": { "read": true, "write": true },
      "userSettings": { "read": true, "write": true },
      "dynamicSettings": { "read": true, "write": true },
      "dynamicAuth": { "read": true, "write": true },
      "organizations": { "read": true, "write": true }
    },
    "resourceConstraints": {
      "clientIds": [],
      "userIds": []
    }
  }
}
```

### Example 3: Limited Support (Client Settings Only, No DynamicAuth)
```json
{
  "username": "support_limited",
  "role": "support_limited",
  "permissions": {
    "organizations": "specific",
    "organizationIds": ["507f1f77bcf86cd799439011"],
    "features": {
      "globalSettings": { "read": false, "write": false },
      "clientSettings": { "read": true, "write": true },
      "userSettings": { "read": false, "write": false },
      "dynamicSettings": { "read": true, "write": true },
      "dynamicAuth": { "read": false, "write": false },
      "organizations": { "read": true, "write": false }
    },
    "resourceConstraints": {
      "clientIds": [],
      "userIds": []
    }
  }
}
```

### Example 4: Client-Specific Support (ClientId 74 Only)
```json
{
  "username": "support_client74",
  "role": "support_limited",
  "permissions": {
    "organizations": "specific",
    "organizationIds": ["507f1f77bcf86cd799439011"],
    "features": {
      "globalSettings": { "read": false, "write": false },
      "clientSettings": { "read": true, "write": true },
      "userSettings": { "read": false, "write": false },
      "dynamicSettings": { "read": true, "write": true },
      "dynamicAuth": { "read": false, "write": false },
      "organizations": { "read": true, "write": false }
    },
    "resourceConstraints": {
      "clientIds": ["74"],
      "userIds": [],
      "userIdPatterns": []
    }
  }
}
```

### Example 5: Self-Service User (Alan - Own Settings Only)
```json
{
  "username": "alan",
  "role": "support_readonly",
  "permissions": {
    "organizations": "specific",
    "organizationIds": ["507f1f77bcf86cd799439011"],
    "features": {
      "globalSettings": { "read": false, "write": false },
      "clientSettings": { "read": false, "write": false },
      "userSettings": { "read": true, "write": true },
      "dynamicSettings": { "read": false, "write": false },
      "dynamicAuth": { "read": false, "write": false },
      "organizations": { "read": false, "write": false }
    },
    "resourceConstraints": {
      "clientIds": [],
      "userIds": ["74_alan"],
      "userIdPatterns": []
    }
  }
}
```

### Example 6: Client Support Team (Luke - Client 68 + User Management)
```json
{
  "username": "luke_client68",
  "role": "support",
  "permissions": {
    "organizations": "specific",
    "organizationIds": ["507f1f77bcf86cd799439011"],
    "features": {
      "globalSettings": { "read": false, "write": false },
      "clientSettings": { "read": true, "write": true },
      "userSettings": { "read": true, "write": true },
      "dynamicSettings": { "read": true, "write": true },
      "dynamicAuth": { "read": false, "write": false },
      "organizations": { "read": true, "write": false }
    },
    "resourceConstraints": {
      "clientIds": ["68"],
      "userIds": [],
      "userIdPatterns": [
        { "pattern": "68_", "matchType": "prefix" },
        { "pattern": "_68", "matchType": "suffix" }
      ]
    }
  }
}
```

### Example 7: Lead Developer (Susan - All Orgs, No DynamicAuth)
```json
{
  "username": "susan_lead",
  "role": "support",
  "permissions": {
    "organizations": "all",
    "organizationIds": [],
    "features": {
      "globalSettings": { "read": true, "write": true },
      "clientSettings": { "read": true, "write": true },
      "userSettings": { "read": true, "write": true },
      "dynamicSettings": { "read": true, "write": true },
      "dynamicAuth": { "read": false, "write": false },
      "organizations": { "read": true, "write": true }
    },
    "resourceConstraints": {
      "clientIds": [],
      "userIds": [],
      "userIdPatterns": []
    }
  }
}
```

### Example 8: Division Admin (Roberto - Org 38, No DynamicAuth)
```json
{
  "username": "roberto_div",
  "role": "support",
  "permissions": {
    "organizations": "specific",
    "organizationIds": ["507f1f77bcf86cd799439012"],
    "features": {
      "globalSettings": { "read": true, "write": true },
      "clientSettings": { "read": true, "write": true },
      "userSettings": { "read": true, "write": true },
      "dynamicSettings": { "read": true, "write": true },
      "dynamicAuth": { "read": false, "write": false },
      "organizations": { "read": true, "write": false }
    },
    "resourceConstraints": {
      "clientIds": [],
      "userIds": [],
      "userIdPatterns": []
    }
  }
}
```

## Migration Strategy

### Backward Compatibility
1. Keep ENV-based admin credentials working
2. Auto-create admin user on first run if not exists
3. Migrate existing sessions gracefully

### Migration Steps
1. Deploy User model and migration script
2. Create default admin user from ENV credentials
3. Update authentication middleware with fallback
4. Gradually roll out permission checks
5. Remove ENV fallback after transition period

## Future Enhancements

### Short Term (3-6 months)
- API key support for programmatic access
- Role templates and cloning
- Time-based access restrictions
- IP whitelisting per user

### Long Term (6-12 months)
- LDAP/SSO integration
- Multi-factor authentication
- Advanced audit logs with UI
- Delegated admin capabilities
- Auto-expiring temporary access grants

## Metrics & Monitoring

### Key Metrics
- Failed login attempts per user
- Permission-denied events by endpoint
- User session durations
- Most accessed features by role

### Alerts
- Multiple failed login attempts (brute force)
- Excessive 403 errors (misconfigured permissions)
- Dormant user accounts (security review)

## Conclusion

This plan provides a comprehensive, phased approach to implementing granular support account access. The flexible permission model supports all required use cases while maintaining security and auditability. The implementation prioritizes backward compatibility and can be rolled out incrementally with minimal disruption to existing functionality.

## Use Case Summary

The following table summarizes all supported use cases:

| Use Case | User | Org Scope | Features Enabled | Resource Constraints | Example Config |
|----------|------|-----------|------------------|---------------------|----------------|
| **Self-Service User** | Alan | Single Org | User Settings only | Own userId only (74_alan) | Example 5 |
| **Client Support Team** | Luke | Single Org | Client + User Settings, Dynamic Settings | ClientId 68 + userIds with "68_" or "_68" | Example 6 |
| **Lead Developer** | Susan | All Orgs | All settings (Global, Client, User, Dynamic) | No DynamicAuth feature | Example 7 |
| **Division Admin** | Roberto | Single Org (38) | All settings (Global, Client, User, Dynamic) | No DynamicAuth feature | Example 8 |
| **Client-Specific Support** | - | Single Org | Client + Dynamic Settings | ClientId 74 only | Example 4 |
| **Full Org Support** | - | Single Org | All features except DynamicAuth write | Full org access | Example 1 |
| **Platform Admin** | - | All Orgs | All features | No constraints | Example 2 |
| **Limited Support** | - | Single Org | Client + Dynamic Settings only | No DynamicAuth feature | Example 3 |

## Key Implementation Notes

### Pattern-Based UserId Filtering

Since the user settings collection doesn't have a dedicated `clientId` field, the system supports pattern-based userId filtering. This allows client support teams to manage user settings for all users belonging to their client.

**Supported Match Types:**
- **exact**: Exact userId match
- **prefix**: userId starts with pattern (e.g., "68_" matches "68_john", "68_jane")
- **suffix**: userId ends with pattern (e.g., "_68" matches "john_68", "jane_68")
- **contains**: userId contains pattern anywhere
- **regex**: Advanced regex pattern matching

**Controller Implementation Example:**
```javascript
// src/controllers/settingsController.js

async function getUserSettings(req, res) {
  const { orgId } = req.params;
  const constraints = req.session.permissions.resourceConstraints;
  
  let query = { organizationId: orgId };
  
  // Apply userId constraints
  if (constraints.userIds && constraints.userIds.length > 0) {
    query.userId = { $in: constraints.userIds };
  } else if (constraints.userIdPatterns && constraints.userIdPatterns.length > 0) {
    // Build regex query for pattern matching
    const patterns = constraints.userIdPatterns.map(p => {
      switch (p.matchType) {
        case 'exact': return `^${p.pattern}$`;
        case 'prefix': return `^${p.pattern}`;
        case 'suffix': return `${p.pattern}$`;
        case 'contains': return p.pattern;
        case 'regex': return p.pattern;
        default: return `^${p.pattern}$`;
      }
    });
    
    query.userId = { $regex: new RegExp(patterns.join('|')) };
  }
  
  const settings = await UserSetting.find(query);
  res.json(settings);
}
```

### UI Filtering Considerations

**Organization Selector:**
- Filter dropdown to show only accessible organizations
- For `organizations: 'all'` → show all orgs
- For `organizations: 'specific'` → show only orgs in `organizationIds` array

**Client Listing:**
- Filter client lists by `resourceConstraints.clientIds`
- Empty array = show all clients within accessible orgs
- Populated array = show only specified clientIds

**User Listing:**
- Apply pattern matching on client side for better UX
- Show only users matching `userIds` or `userIdPatterns`
- Display pattern info to help users understand scope (e.g., "Showing users matching: 68_*, *_68")

### Security Best Practices

1. **Principle of Least Privilege**: Always grant minimum required permissions
2. **Regular Audits**: Review user permissions quarterly
3. **Pattern Safety**: Validate regex patterns to prevent ReDoS attacks
4. **Logging**: Log all pattern-based access attempts for audit trail
5. **Session Timeout**: Enforce strict session timeout for high-privilege accounts
6. **Password Rotation**: Require password changes every 90 days for support accounts

## Testing Strategy

### Unit Tests
- Test each middleware function independently
- Test pattern matching logic with edge cases
- Test permission inheritance and defaults

### Integration Tests
- Test route protection with various permission combinations
- Test Alan's self-service scenario (single userId)
- Test Luke's client support scenario (pattern matching)
- Test Susan's all-org access (no DynamicAuth)
- Test Roberto's division admin access (single org, no DynamicAuth)

### E2E Tests
- Login flow for each user type
- Navigation visibility based on permissions
- CRUD operations with permission checks
- Error handling for 403 Forbidden scenarios

### Test Data Setup
```javascript
// Create test users for each scenario
const testUsers = [
  createUser('alan', alanPermissions),           // Self-service
  createUser('luke', lukePermissions),           // Client support
  createUser('susan', susanPermissions),         // Lead dev
  createUser('roberto', robertoPermissions),     // Division admin
  createUser('support_74', client74Permissions), // Client-specific
  createUser('admin', adminPermissions)          // Full admin
];
```
