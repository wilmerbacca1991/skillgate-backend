const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stage: {
      type: String,
      enum: ['applied', 'assessment', 'interview', 'decision', 'hired', 'rejected'],
      default: 'applied'
    },
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });
applicationSchema.index({ candidate: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);
