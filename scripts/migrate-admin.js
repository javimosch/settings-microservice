#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  role: String,
  permissions: {
    organizations: String,
    organizationIds: [mongoose.Schema.Types.ObjectId],
    features: {
      globalSettings: { read: Boolean, write: Boolean },
      clientSettings: { read: Boolean, write: Boolean },
      userSettings: { read: Boolean, write: Boolean },
      dynamicSettings: { read: Boolean, write: Boolean },
      dynamicAuth: { read: Boolean, write: Boolean },
      organizations: { read: Boolean, write: Boolean }
    },
    resourceConstraints: {
      clientIds: [String],
      userIds: [String],
      userIdPatterns: [{
        pattern: String,
        matchType: String
      }]
    }
  },
  active: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function migrateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminUsername = process.env.BASIC_AUTH_USER || 'admin';
    const adminPassword = process.env.BASIC_AUTH_PASS || 'admin123';

    const existing = await User.findOne({ username: adminUsername });
    
    if (existing) {
      console.log(`✓ Admin user '${adminUsername}' already exists`);
      await mongoose.connection.close();
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = new User({
      username: adminUsername,
      password: hashedPassword,
      email: '',
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
        resourceConstraints: {
          clientIds: [],
          userIds: [],
          userIdPatterns: []
        }
      },
      active: true
    });

    await admin.save();
    console.log(`✓ Admin user '${adminUsername}' created successfully from ENV credentials`);
    console.log('  You can now login with this account');
    
    await mongoose.connection.close();
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAdmin();
