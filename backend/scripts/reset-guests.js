// Deletes every guest account so the app starts fresh on the next open (dev/testing only).
// Registered accounts (with an email) are never touched.
// Usage (from backend/):
//   npm run reset-guests          local database (MONGODB_URI in backend/.env)
//   npm run reset-guests:online   online database (MONGODB_URI_ONLINE in backend/.env)
// Careful online: this removes testers' guest accounts too, not only yours.
require('dotenv').config();
const mongoose = require('mongoose');

const online = process.argv.includes('--online');

(async () => {
  const key = online ? 'MONGODB_URI_ONLINE' : 'MONGODB_URI';
  const uri = process.env[key];
  if (!uri) throw new Error(`${key} is not set in backend/.env`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const users = mongoose.connection.db.collection('users');
  const { deletedCount } = await users.deleteMany({ isGuest: true });
  const kept = await users.countDocuments({});
  console.log(`${online ? 'Online' : 'Local'} database: deleted ${deletedCount} guest account(s). Kept ${kept} registered account(s).`);
  console.log('Now fully close and reopen the app (or shake → Reload) to start fresh.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
