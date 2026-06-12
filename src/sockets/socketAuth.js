const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
try {
const authHeader = socket.handshake.headers.authorization;
const authToken = socket.handshake.auth?.token;

let token = authToken;

if (!token && authHeader && authHeader.startsWith('Bearer ')) {
token = authHeader.split(' ')[1];
}

if (!token) {
return next(new Error('Socket auth failed: token missing'));
}

const decoded = jwt.verify(token, process.env.JWT_SECRET);

socket.user = {
userId: decoded.userId,
role: decoded.role
};

next();
} catch (error) {
next(new Error('Socket auth failed: token invalid'));
}
};

module.exports = socketAuth;
