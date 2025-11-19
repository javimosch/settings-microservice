const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['admin', 'support', 'support_limited', 'support_readonly'],
    default: 'support'
  },
  permissions: {
    organizations: {
      type: String,
      enum: ['all', 'specific'],
      default: 'specific'
    },
    organizationIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    }],
    features: {
      globalSettings: {
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false }
      },
      clientSettings: {
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false }
      },
      userSettings: {
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false }
      },
      dynamicSettings: {
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false }
      },
      dynamicAuth: {
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false }
      },
      organizations: {
        read: { type: Boolean, default: false },
        write: { type: Boolean, default: false }
      }
    },
    resourceConstraints: {
      clientIds: [String],
      userIds: [String],
      userIdPatterns: [{
        pattern: String,
        matchType: {
          type: String,
          enum: ['exact', 'prefix', 'suffix', 'contains', 'regex'],
          default: 'exact'
        }
      }]
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
