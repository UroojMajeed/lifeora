// Saves a copy of every collection to backend/backups/<database>-<date>/, one JSON file each
// (Extended JSON, so dates and ids come back exactly). Run it before anything risky.
// Usage (from backend/):
//   npm run backup          local database (MONGODB_URI in backend/.env)
//   npm run backup:online   online database (MONGODB_URI_ONLINE in backend/.env)
// Backups hold people's data: they stay on this computer (the folder is git-ignored). Delete old ones.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const online = process.argv.includes('--online');
const { EJSON } = mongoose.mongo.BSON;

(async () => {
  const key = online ? 'MONGODB_URI_ONLINE' : 'MONGODB_URI';
  const uri = process.env[key];
  if (!uri) throw new Error(`${key} is not set in backend/.env`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const { db } = mongoose.connection;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(__dirname, '..', 'backups', `${db.databaseName}-${online ? 'online' : 'local'}-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  let total = 0;
  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), EJSON.stringify(docs, null, 0, { relaxed: false }));
    console.log(`  ${name}: ${docs.length}`);
    total += docs.length;
  }
  console.log(`${online ? 'Online' : 'Local'} backup: ${total} document(s) saved to ${path.relative(process.cwd(), dir)}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
