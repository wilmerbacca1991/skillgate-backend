const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, default: '', trim: true, lowercase: true },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

companySchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);
