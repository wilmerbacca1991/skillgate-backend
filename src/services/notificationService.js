const Notification = require('../models/Notification');

const buildRelatedInterviewFilter = (relatedInterview) => {
  if (relatedInterview) {
    return { relatedInterview };
  }

  // Match both unset and explicit null for backward compatibility.
  return { $or: [{ relatedInterview: { $exists: false } }, { relatedInterview: null }] };
};

const createNotificationOnce = async ({
  user,
  type,
  title,
  message,
  relatedInterview,
  extra = {}
}) => {
  const filter = {
    user,
    type,
    title,
    ...buildRelatedInterviewFilter(relatedInterview)
  };

  const notification = await Notification.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        user,
        type,
        title,
        message,
        ...(relatedInterview ? { relatedInterview } : {}),
        ...extra
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  ).select('_id user type title message relatedInterview read readAt hiddenAt createdAt updatedAt');

  return { notification, created: true };
};

module.exports = {
  createNotificationOnce
};