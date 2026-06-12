const Interview = require('../models/Interview');
const { createNotificationOnce } = require('./notificationService');

const getWindowBounds = () => {
  const now = new Date();
  const start = new Date(now.getTime() + 14 * 60 * 1000);
  const end = new Date(now.getTime() + 16 * 60 * 1000);
  return { start, end };
};

const runInterviewReminderTick = async () => {
  const { start, end } = getWindowBounds();

  const interviews = await Interview.find({
    status: 'scheduled',
    scheduledAt: { $gte: start, $lte: end }
  }).select('_id candidate scheduledAt');

  for (const interview of interviews) {
    await createNotificationOnce({
      user: interview.candidate,
      type: 'general',
      title: 'Interview reminder',
      message: `Your interview starts at ${new Date(interview.scheduledAt).toLocaleString()}.`,
      relatedInterview: interview._id
    });
  }
};

const startInterviewReminderLoop = () => {
  const enabled = String(process.env.ENABLE_INTERVIEW_REMINDERS || 'false').toLowerCase() === 'true';

  if (!enabled) {
    return null;
  }

  const timer = setInterval(() => {
    runInterviewReminderTick().catch(() => {
      // Avoid crashing the app because reminder tick failed.
    });
  }, 60 * 1000);

  return timer;
};

module.exports = {
  runInterviewReminderTick,
  startInterviewReminderLoop
};
