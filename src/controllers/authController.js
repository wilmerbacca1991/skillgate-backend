const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const {
generateAccessToken,
generateRefreshToken,
setRefreshTokenCookie,
clearRefreshTokenCookie
} = require('../utils/tokenUtils');

const isBcryptHash = (value) => /^\$2[aby]\$\d{2}\$/.test(String(value || ''));

const toUserResponse = (user) => {
const normalized = user.toObject ? user.toObject() : user;

return {
id: normalized._id,
firstName: normalized.firstName,
lastName: normalized.lastName,
email: normalized.email,
role: normalized.role,
profileImageUrl: normalized.profileImageUrl || ''
};
};

const buildAuthResponse = (user, accessToken) => {
return {
accessToken,
user: toUserResponse(user)
};
};

const registerUser = async (req, res) => {
try {
const { firstName, lastName, email, password, role } = req.body;

const existingUser = await User.findOne({ email });
if (existingUser) {
return res.status(400).json({ message: 'User already exists' });
}

const hashedPassword = await bcrypt.hash(password, 10);

const user = await User.create({
firstName,
lastName,
email,
password: hashedPassword,
role
});

const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

setRefreshTokenCookie(res, refreshToken);

res.status(201).json({
message: 'User registered successfully',
...buildAuthResponse(user, accessToken)
});
} catch (error) {
res.status(500).json({ message: 'Server error during registration' });
}
};

const loginUser = async (req, res) => {
try {
const { email, password } = req.body;

const normalizedEmail = String(email || '').trim().toLowerCase();
const candidatePassword = String(password || '');

const user = await User.findOne({ email: normalizedEmail });
if (!user) {
return res.status(401).json({ message: 'Invalid credentials' });
}

if (!user.password || typeof user.password !== 'string') {
return res.status(401).json({ message: 'Invalid credentials' });
}

let passwordsMatch = false;

if (isBcryptHash(user.password)) {
passwordsMatch = await bcrypt.compare(candidatePassword, user.password);
} else {
// Backward compatibility for legacy plain-text seeded/test accounts.
passwordsMatch = candidatePassword === user.password;

if (passwordsMatch) {
user.password = await bcrypt.hash(candidatePassword, 10);
await user.save();
}
}

if (!passwordsMatch) {
return res.status(401).json({ message: 'Invalid credentials' });
}

const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

setRefreshTokenCookie(res, refreshToken);

res.status(200).json({
message: 'Login successful',
...buildAuthResponse(user, accessToken)
});
} catch (error) {
console.error('Login failure:', error.message);
res.status(500).json({ message: 'Server error during login' });
}
};

const refreshAccessToken = async (req, res) => {
try {
const cookieToken = req.cookies?.refreshToken;
const headerToken = req.headers['x-refresh-token'];
const bodyToken = req.body?.refreshToken;
const refreshToken = cookieToken || headerToken || bodyToken;

if (!refreshToken) {
return res.status(401).json({ message: 'Refresh token missing' });
}

const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

if (decoded.tokenType !== 'refresh') {
return res.status(401).json({ message: 'Invalid refresh token type' });
}

const user = await User.findById(decoded.userId);
if (!user) {
return res.status(401).json({ message: 'User not found for refresh token' });
}

const accessToken = generateAccessToken(user);

res.status(200).json({
message: 'Access token refreshed',
accessToken
});
} catch (error) {
res.status(401).json({ message: 'Invalid or expired refresh token' });
}
};

const logoutUser = async (req, res) => {
try {
clearRefreshTokenCookie(res);

res.status(200).json({ message: 'Logged out successfully' });
} catch (error) {
res.status(500).json({ message: 'Server error during logout' });
}
};

const getMe = async (req, res) => {
try {
res.status(200).json({ user: toUserResponse(req.user) });
} catch (error) {
res.status(500).json({ message: 'Server error while fetching profile' });
}
};

const uploadProfileImage = async (req, res) => {
try {
if (!req.file) {
return res.status(400).json({ message: 'Please upload an image file.' });
}

const user = await User.findById(req.user._id);
if (!user) {
return res.status(404).json({ message: 'User not found' });
}

if (user.profileImageUrl && user.profileImageUrl.startsWith('/uploads/profiles/')) {
const oldFilePath = path.join(
__dirname,
'..',
'..',
user.profileImageUrl.replace(/^\//, '').replace(/\//g, path.sep)
);

if (fs.existsSync(oldFilePath)) {
try {
fs.unlinkSync(oldFilePath);
} catch {
// ignore file cleanup errors
}
}
}

user.profileImageUrl = `/uploads/profiles/${req.file.filename}`;
await user.save();

return res.status(200).json({
message: 'Profile image uploaded successfully',
profileImageUrl: user.profileImageUrl,
user: toUserResponse(user)
});
} catch (error) {
return res.status(500).json({ message: 'Failed to upload profile image' });
}
};

module.exports = {
registerUser,
loginUser,
refreshAccessToken,
logoutUser,
getMe,
uploadProfileImage
};