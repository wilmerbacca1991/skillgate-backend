const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    submittedOutput: { type: String, default: '' },
    passedTests: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    scoreEarned: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    aiFeedback: { type: String, default: '' },
    hintCount: { type: Number, default: 0 },
    hints: { type: [String], default: [] }
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired'],
      default: 'in_progress'
    },
    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: { type: Date },
    answers: { type: [answerSchema], default: [] },
    totalScoreEarned: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

attemptSchema.index({ assessment: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Attempt', attemptSchema);
