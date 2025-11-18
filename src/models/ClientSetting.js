const mongoose = require('mongoose');

const common = {
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

const ClientSettingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Types.ObjectId, required: true, index: true },
  clientId: { type: String, required: true },
  settingKey: { type: String, required: true },
  settingValue: mongoose.Schema.Types.Mixed,
  description: String,
  ...common
});

ClientSettingSchema.index({ organizationId: 1, clientId: 1, settingKey: 1 }, { unique: true });

ClientSettingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ClientSetting', ClientSettingSchema);
