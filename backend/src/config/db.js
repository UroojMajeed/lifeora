const mongoose = require('mongoose');

let connecting = null;

// Connects once and reuses the connection (serverless hosts call this on every request).
async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!connecting) {
    connecting = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then(() => console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`))
      .catch((err) => {
        connecting = null; // let the next request try again
        throw err;
      });
  }
  await connecting;
  return mongoose.connection;
}

module.exports = connectDB;
