const mongoose = require('mongoose');

const RECONNECT_DELAY_MS = 10000;
let reconnectTimer = null;
let connecting = false;
let listenersRegistered = false;

const scheduleReconnect = () => {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectDB();
  }, RECONNECT_DELAY_MS);
};

const connectDB = async () => {
  if (connecting || mongoose.connection.readyState === 1) {
    return;
  }

  connecting = true;

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    console.log(`MongoDB connected: ${connection.connection.host}`);

    if (!listenersRegistered) {
      listenersRegistered = true;

      mongoose.connection.on('disconnected', () => {
        console.error('MongoDB disconnected. Retrying connection...');
        scheduleReconnect();
      });

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error.message);
      });
    }
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    scheduleReconnect();
  } finally {
    connecting = false;
  }
};

module.exports = connectDB;