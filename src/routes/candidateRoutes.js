const express = require('express');
const { body } = require('express-validator');
const {
  getCandidateMe,
  getOpenJobs,
  getCandidateAssessments,
  createCandidateSubmission,
  getCandidateFeedbackBySubmission
} = require('../controllers/candidateController');
const { applyToJob, getMyApplications } = require('../controllers/applicationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/me', protect, authorizeRoles('candidate'), getCandidateMe);
router.get('/jobs', protect, authorizeRoles('candidate'), getOpenJobs);
router.get('/assessments', protect, authorizeRoles('candidate'), getCandidateAssessments);

router.post(
  '/submissions',
  protect,
  authorizeRoles('candidate'),
  [body('assessmentId').notEmpty().withMessage('assessmentId is required')],
  validateRequest,
  createCandidateSubmission
);

router.get(
  '/feedback/:submissionId',
  protect,
  authorizeRoles('candidate'),
  getCandidateFeedbackBySubmission
);

router.post(
  '/applications',
  protect,
  authorizeRoles('candidate'),
  [body('jobId').notEmpty().withMessage('jobId is required')],
  validateRequest,
  applyToJob
);

router.get('/applications', protect, authorizeRoles('candidate'), getMyApplications);

module.exports = router;
