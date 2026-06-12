const express = require('express');
const { body } = require('express-validator');

const {
  createInterview,
  getMyInterviews,
  updateInterviewStatus,
  deleteInterview,
  generateInterviewRoom,
  getInterviewByRoomId,
} = require('../controllers/interviewController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/mine', protect, getMyInterviews);
router.get('/room/:roomId', protect, getInterviewByRoomId);

router.post(
  '/',
  protect,
  authorizeRoles('recruiter', 'admin'),
  [
    body('scheduledAt').notEmpty().withMessage('scheduledAt is required'),
    body('durationMinutes').optional().isInt({ min: 15 }).withMessage('durationMinutes must be >= 15'),
  ],
  validateRequest,
  createInterview
);

router.post(
  '/schedule',
  protect,
  authorizeRoles('recruiter', 'admin'),
  [
    body('scheduledAt').notEmpty().withMessage('scheduledAt is required'),
    body('durationMinutes').optional().isInt({ min: 15 }).withMessage('durationMinutes must be >= 15'),
  ],
  validateRequest,
  createInterview
);

router.patch(
  '/:interviewId/status',
  protect,
  authorizeRoles('recruiter', 'admin'),
  [
    body('status')
      .isIn(['scheduled', 'completed', 'cancelled'])
      .withMessage('status must be scheduled, completed, or cancelled'),
  ],
  validateRequest,
  updateInterviewStatus
);

router.delete('/:interviewId', protect, deleteInterview);

router.patch(
  '/:interviewId/room',
  protect,
  authorizeRoles('recruiter', 'admin'),
  generateInterviewRoom
);

module.exports = router;
