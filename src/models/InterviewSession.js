const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['candidate', 'recruiter', 'admin'] },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date }
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, unique: true },
    roomId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['ready', 'active', 'ended'],
      default: 'ready'
    },
    participants: { type: [participantSchema], default: [] },
    notes: {
      type: [
        {
          by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          text: { type: String, trim: true },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    endedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
