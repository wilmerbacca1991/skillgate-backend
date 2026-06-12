const mongoose = require('mongoose');

const feedbackReportSchema = new mongoose.Schema(
  {
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportType: { type: String, enum: ['feedback', 'hint'], required: true },
    content: { type: String, default: '' },
    promptVersion: { type: String, default: 'v1' },
    modelProvider: { type: String, default: 'fallback' },
    modelName: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

feedbackReportSchema.index({ attempt: 1, challenge: 1, reportType: 1, createdAt: -1 });
feedbackReportSchema.index({ candidate: 1, createdAt: -1 });

module.exports = mongoose.model('FeedbackReport', feedbackReportSchema);
