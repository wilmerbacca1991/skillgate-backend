const express = require('express');

const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/mine', protect, getMyNotifications);
router.patch('/mine/read-all', protect, markAllNotificationsRead);
router.patch('/:notificationId/read', protect, markNotificationRead);
router.delete('/:notificationId', protect, deleteNotification);

module.exports = router;
