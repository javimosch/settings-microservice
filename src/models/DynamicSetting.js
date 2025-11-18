const mongoose = require('mongoose');

const common = {
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

const DynamicSettingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Types.ObjectId, required: true, index: true },
  uniqueId: { type: String, required: true },
  settingKey: { type: String, required: true },
  settingValue: mongoose.Schema.Types.Mixed,
  description: String,
  ...common
});

DynamicSettingSchema.index({ organizationId: 1, uniqueId: 1, settingKey: 1 }, { unique: true });

DynamicSettingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DynamicSetting', DynamicSettingSchema);
