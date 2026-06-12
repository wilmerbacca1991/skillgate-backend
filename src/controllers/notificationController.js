const Notification = require('../models/Notification');

const buildRelatedInterviewKey = (notification) =>
  notification?.relatedInterview ? String(notification.relatedInterview) : '';

const buildNotificationDedupeKey = (notification) =>
  [
    String(notification?.user || ''),
    String(notification?.type || ''),
    String(notification?.title || ''),
    buildRelatedInterviewKey(notification)
  ].join('::');

const buildRelatedInterviewFilter = (notification) => {
  if (notification?.relatedInterview) {
    return { relatedInterview: notification.relatedInterview };
  }

  return { $or: [{ relatedInterview: { $exists: false } }, { relatedInterview: null }] };
};

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id, hiddenAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .populate('relatedInterview', 'scheduledAt status meetingLink timezone');

    // Collapse legacy duplicate rows to avoid repeated copies surfacing in dashboards.
    const dedupedNotifications = [];
    const seenKeys = new Set();

    for (const item of notifications) {
      const key = buildNotificationDedupeKey(item);
      if (seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      dedupedNotifications.push(item);
    }

    const unreadCount = dedupedNotifications.filter((item) => !item.read).length;

    return res.status(200).json({ notifications: dedupedNotifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      hiddenAt: { $exists: false }
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (String(notification.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notification' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false, hiddenAt: { $exists: false } },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notifications' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      hiddenAt: { $exists: false }
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (String(notification.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!notification.read) {
      return res.status(400).json({ message: 'Only read notifications can be deleted' });
    }

    await Notification.deleteMany(
      {
        user: notification.user,
        type: notification.type,
        title: notification.title,
        ...buildRelatedInterviewFilter(notification)
      }
    );

    return res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
