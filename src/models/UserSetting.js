const mongoose = require('mongoose');

const common = {
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

const UserSettingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Types.ObjectId, required: true, index: true },
  userId: { type: String, required: true },
  settingKey: { type: String, required: true },
  settingValue: mongoose.Schema.Types.Mixed,
  description: String,
  ...common
});

UserSettingSchema.index({ organizationId: 1, userId: 1, settingKey: 1 }, { unique: true });

UserSettingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserSetting', UserSettingSchema);
