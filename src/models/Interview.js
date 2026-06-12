const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, min: 15, default: 60 },
    timezone: { type: String, default: 'UTC' },
    meetingLink: { type: String, default: '' },
    roomId: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    cancelledAt: { type: Date },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

interviewSchema.index({ candidate: 1, scheduledAt: -1 });
interviewSchema.index({ recruiter: 1, scheduledAt: -1 });
interviewSchema.index({ roomId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Interview', interviewSchema);
