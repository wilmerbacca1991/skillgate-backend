const passport = require('passport');

const protect = async (req, res, next) => {
	return passport.authenticate('jwt', { session: false }, (error, user) => {
		if (error) {
			return res.status(401).json({ message: 'Not authorized, token invalid' });
		}

		if (!user) {
			return res.status(401).json({ message: 'Not authorized, token missing or invalid' });
		}

		req.user = user;
		return next();
	})(req, res, next);
};

const authorizeRoles = (...allowedRoles) => {
return (req, res, next) => {
if (!req.user || !allowedRoles.includes(req.user.role)) {
return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
}

next();
};
};

module.exports = {
protect,
authorizeRoles
};
