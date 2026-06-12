const express = require('express');
const { body } = require('express-validator');
const {
registerUser,
loginUser,
refreshAccessToken,
logoutUser,
getMe,
uploadProfileImage
} = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadProfileImageMiddleware } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post(
'/register',
[
body('firstName').notEmpty().withMessage('First name is required'),
body('lastName').notEmpty().withMessage('Last name is required'),
body('email').isEmail().withMessage('Valid email is required'),
body('password')
.isLength({ min: 8 })
.withMessage('Password must be at least 8 characters long'),
body('role')
.isIn(['candidate', 'recruiter', 'admin'])
.withMessage('Role must be candidate, recruiter, or admin')
],
validateRequest,
registerUser
);

router.post(
'/login',
[
body('email').isEmail().withMessage('Valid email is required'),
body('password').notEmpty().withMessage('Password is required')
],
validateRequest,
loginUser
);

router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

router.get('/me', protect, getMe);

router.post(
'/profile-image',
protect,
uploadProfileImageMiddleware.single('image'),
uploadProfileImage
);

router.get(
'/recruiter-only',
protect,
authorizeRoles('recruiter', 'admin'),
(req, res) => {
res.status(200).json({
message: 'Recruiter/admin route accessed successfully',
user: req.user
});
}
);

module.exports = router;