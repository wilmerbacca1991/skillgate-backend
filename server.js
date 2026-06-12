const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const challengeRoutes = require('./src/routes/challengeRoutes');
const assessmentRoutes = require('./src/routes/assessmentRoutes');
const recruiterRoutes = require('./src/routes/recruiterRoutes');
const interviewRoutes = require('./src/routes/interviewRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const candidateRoutes = require('./src/routes/candidateRoutes');
const socketAuth = require('./src/sockets/socketAuth');
const registerCollabHandlers = require('./src/sockets/collabSocket');
const registerInterviewHandlers = require('./src/sockets/interviewSocket');
const rateLimit = require('express-rate-limit');
const { configurePassport } = require('./src/config/passport');
const { startInterviewReminderLoop } = require('./src/services/interviewReminderService');

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/$/, '');

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(normalizeOrigin(origin));
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});

io.use(socketAuth);

io.on('connection', (socket) => {
  registerCollabHandlers(io, socket);
});

const interviewIo = io.of('/interview');
interviewIo.use(socketAuth);
interviewIo.on('connection', (socket) => {
  registerInterviewHandlers(io, socket);
});

connectDB();
configurePassport();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'SkillGate backend is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development'
  });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/candidate', candidateRoutes);

startInterviewReminderLoop();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Allowed CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : 'none configured'}`
  );
});