const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const configurePassport = () => {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
      },
      async (jwtPayload, done) => {
        try {
          return done(null, {
            _id: jwtPayload.userId,
            role: jwtPayload.role,
            firstName: jwtPayload.firstName || '',
            lastName: jwtPayload.lastName || '',
            email: jwtPayload.email || ''
          });
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};

module.exports = {
  configurePassport,
};