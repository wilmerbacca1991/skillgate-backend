const express = require('express');
const { body } = require('express-validator');
const {
  createChallenge,
  updateChallenge,
  deleteChallenge,
  getAllChallenges,
  getChallengeById
} = require('../controllers/challengeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/', protect, getAllChallenges);
router.get('/:challengeId', protect, getChallengeById);

router.put(
  '/:challengeId',
  protect,
  authorizeRoles('recruiter', 'admin'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('testCases').isArray({ min: 1 }).withMessage('At least one test case is required')
  ],
  validateRequest,
  updateChallenge
);

router.delete('/:challengeId', protect, authorizeRoles('recruiter', 'admin'), deleteChallenge);

router.post(
  '/',
  protect,
  authorizeRoles('recruiter', 'admin'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('testCases').isArray({ min: 1 }).withMessage('At least one test case is required')
  ],
  validateRequest,
  createChallenge
);

module.exports = router;
