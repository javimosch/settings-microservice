const mongoose = require('mongoose');

const common = {
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

const DynamicAuthSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['http', 'js'], required: true },
  http: {
    url: String,
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
    queryParams: mongoose.Schema.Types.Mixed,
    bodyParams: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed
  },
  jsCode: String,
  cacheTTLSeconds: { type: Number, default: 60 },
  enabled: { type: Boolean, default: true },
  description: String,
  ...common
});

DynamicAuthSchema.index({ organizationId: 1, name: 1 }, { unique: true });

DynamicAuthSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DynamicAuth', DynamicAuthSchema);
