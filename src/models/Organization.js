const mongoose = require('mongoose');

const common = {
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  ...common
});

OrganizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Organization', OrganizationSchema);
