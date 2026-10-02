// Vercel entry point: every request is routed here (see vercel.json) and handed to the Express app.
const app = require('../src/app');
const connectDB = require('../src/config/db');

module.exports = async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Server is not configured (JWT_SECRET missing).' });
  }
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    return res.status(503).json({ message: 'Database unavailable, please try again.' });
  }
  return app(req, res);
};
