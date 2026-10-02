// Deletes every guest account so the app starts fresh on the next open (dev/testing only).
// Registered accounts (with an email) are never touched.
// Usage (from backend/): npm run reset-guests
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in backend/.env');
  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection('users');
  const { deletedCount } = await users.deleteMany({ isGuest: true });
  const kept = await users.countDocuments({});
  console.log(`Deleted ${deletedCount} guest account(s). Kept ${kept} registered account(s).`);
  console.log('Now reload the app on your phone (shake → Reload) to start fresh.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
