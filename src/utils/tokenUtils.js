const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
return jwt.sign(
{
userId: user._id,
role: user.role,
firstName: user.firstName,
lastName: user.lastName,
email: user.email
},
process.env.JWT_SECRET,
{
expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m'
}
);
};

const generateRefreshToken = (user) => {
return jwt.sign(
{
userId: user._id,
tokenType: 'refresh'
},
process.env.JWT_REFRESH_SECRET,
{
expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d'
}
);
};

const setRefreshTokenCookie = (res, refreshToken) => {
const isProduction = process.env.NODE_ENV === 'production';

res.cookie('refreshToken', refreshToken, {
httpOnly: true,
secure: isProduction,
sameSite: isProduction ? 'none' : 'lax',
maxAge: 7 * 24 * 60 * 60 * 1000,
path: '/'
});
};

const clearRefreshTokenCookie = (res) => {
const isProduction = process.env.NODE_ENV === 'production';

res.clearCookie('refreshToken', {
httpOnly: true,
secure: isProduction,
sameSite: isProduction ? 'none' : 'lax',
path: '/'
});
};

module.exports = {
generateAccessToken,
generateRefreshToken,
setRefreshTokenCookie,
clearRefreshTokenCookie
};