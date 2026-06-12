const express = require('express');
const {
  getDashboardSummary,
  getCandidates,
  deleteCandidate,
  getAssessmentAttempts
} = require('../controllers/recruiterController');
const {
  createRecruiterJob,
  getRecruiterApplications,
  assignAssessmentToApplication
} = require('../controllers/jobController');
const { createInterview } = require('../controllers/interviewController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/dashboard-summary',
  protect,
  authorizeRoles('recruiter', 'admin'),
  getDashboardSummary
);

router.get(
  '/analytics',
  protect,
  authorizeRoles('recruiter', 'admin'),
  getDashboardSummary
);

router.post(
  '/jobs',
  protect,
  authorizeRoles('recruiter', 'admin'),
  createRecruiterJob
);

router.get(
  '/applications',
  protect,
  authorizeRoles('recruiter', 'admin'),
  getRecruiterApplications
);

router.post(
  '/assessments/assign',
  protect,
  authorizeRoles('recruiter', 'admin'),
  assignAssessmentToApplication
);

router.post(
  '/interviews/schedule',
  protect,
  authorizeRoles('recruiter', 'admin'),
  createInterview
);

router.get(
  '/candidates',
  protect,
  authorizeRoles('recruiter', 'admin'),
  getCandidates
);

router.delete(
  '/candidates/:candidateId',
  protect,
  authorizeRoles('recruiter', 'admin'),
  deleteCandidate
);

router.get(
  '/assessments/:assessmentId/attempts',
  protect,
  authorizeRoles('recruiter', 'admin'),
  getAssessmentAttempts
);

module.exports = router;
