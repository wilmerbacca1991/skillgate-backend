const express = require('express');
const { body } = require('express-validator');
const {
  getAssessments,
  createAssessment,
  deleteAssessment,
  startAssessment,
  submitChallengeAnswer,
  requestChallengeHint,
  finalizeAssessment,
  getMyAssessmentAttempt
} = require('../controllers/assessmentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/', protect, getAssessments);

router.post(
  '/',
  protect,
  authorizeRoles('recruiter', 'admin'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('durationMinutes').isInt({ min: 5 }).withMessage('durationMinutes must be >= 5'),
    body('challenges').isArray({ min: 1 }).withMessage('At least one challenge is required')
  ],
  validateRequest,
  createAssessment
);

router.delete('/:assessmentId', protect, authorizeRoles('recruiter', 'admin'), deleteAssessment);

router.post('/:assessmentId/start', protect, authorizeRoles('candidate'), startAssessment);
router.post(
  '/:assessmentId/challenges/:challengeId/submit',
  protect,
  authorizeRoles('candidate'),
  submitChallengeAnswer
);
router.post(
  '/:assessmentId/challenges/:challengeId/hint',
  protect,
  authorizeRoles('candidate'),
  requestChallengeHint
);
router.post('/:assessmentId/finalize', protect, authorizeRoles('candidate'), finalizeAssessment);
router.get('/:assessmentId/attempt', protect, authorizeRoles('candidate', 'admin'), getMyAssessmentAttempt);

module.exports = router;
