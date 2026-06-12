const mongoose = require('mongoose');

const assessmentChallengeSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    points: { type: Number, required: true, min: 1, default: 100 },
    order: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    durationMinutes: { type: Number, required: true, min: 5, default: 60 },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    challenges: { type: [assessmentChallengeSchema], default: [] },
    assignedCandidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assessment', assessmentSchema);
