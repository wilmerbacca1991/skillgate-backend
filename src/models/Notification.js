const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['interview_scheduled', 'interview_updated', 'interview_cancelled', 'general'],
      default: 'general'
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedInterview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    hiddenAt: { type: Date }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, hiddenAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
