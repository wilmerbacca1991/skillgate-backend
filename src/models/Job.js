const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    requirements: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'open'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

jobSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
