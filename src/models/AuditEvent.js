const mongoose = require('mongoose');

const AuditEventSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Types.ObjectId, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, required: true, index: true },
  action: { type: String, required: true, enum: ['create', 'update', 'delete'], index: true },
  performedBy: { type: String, required: true },
  performedById: { type: mongoose.Types.ObjectId },
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  meta: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

AuditEventSchema.index({ entityType: 1, createdAt: -1 });
AuditEventSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditEvent', AuditEventSchema);
