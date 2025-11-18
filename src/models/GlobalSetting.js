const mongoose = require('mongoose');

const common = {
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

const GlobalSettingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Types.ObjectId, required: true, index: true },
  settingKey: { type: String, required: true },
  settingValue: mongoose.Schema.Types.Mixed,
  description: String,
  ...common
});

GlobalSettingSchema.index({ organizationId: 1, settingKey: 1 }, { unique: true });

GlobalSettingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('GlobalSetting', GlobalSettingSchema);
