// Guest accounts nobody has used for a long time: a report first, deleting only when asked.
// A guest can't sign back in (no email), so one untouched for 90 days is very likely abandoned.
// Registered accounts are never touched.
// Usage (from backend/):
//   npm run guests:report                  local database, report only
//   npm run guests:report:online           online database, report only
//   node scripts/guest-cleanup.js --online --delete --yes   delete them (back up first: npm run backup:online)
// Options: --days 120 to change how long counts as abandoned (at least 30).
require('dotenv').config();
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const online = args.includes('--online');
const remove = args.includes('--delete');
const sure = args.includes('--yes');
const daysAt = args.indexOf('--days');
const days = daysAt >= 0 ? Number(args[daysAt + 1]) : 90;

(async () => {
  if (!Number.isFinite(days) || days < 30) throw new Error('--days must be 30 or more');
  if (remove && online && !sure) throw new Error('Deleting online needs --yes too (and a backup first: npm run backup:online)');
  const key = online ? 'MONGODB_URI_ONLINE' : 'MONGODB_URI';
  const uri = process.env[key];
  if (!uri) throw new Error(`${key} is not set in backend/.env`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const users = mongoose.connection.db.collection('users');

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const query = { isGuest: true, email: { $exists: false }, updatedAt: { $lt: cutoff } };
  const stale = await users.find(query, { projection: { updatedAt: 1, handoffs: 1, 'onboarding.schedule': 1 } }).toArray();
  const guests = await users.countDocuments({ isGuest: true });
  const withWork = stale.filter((u) => (u.onboarding?.schedule || []).length || (u.handoffs || []).length).length;
  const oldest = stale.reduce((d, u) => (!d || u.updatedAt < d ? u.updatedAt : d), null);

  console.log(`${online ? 'Online' : 'Local'} database: ${guests} guest account(s) in all.`);
  console.log(`Untouched for ${days}+ days: ${stale.length} (${withWork} with a routine or handoffs)${oldest ? `, oldest last used ${oldest.toISOString().slice(0, 10)}` : ''}.`);

  if (!remove) {
    console.log(stale.length ? 'Report only: nothing was deleted. Add --delete to remove them.' : 'Nothing to clean up.');
  } else if (stale.length) {
    const { deletedCount } = await users.deleteMany({ _id: { $in: stale.map((u) => u._id) } });
    console.log(`Deleted ${deletedCount} abandoned guest account(s).`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Guest cleanup failed:', err.message);
  process.exit(1);
});
