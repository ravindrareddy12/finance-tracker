// One-time migration from the old shared `backups` collection, where all
// users (with plaintext passwords) lived under one `ft_users` key, to
// per-user accounts:
//   ft_users            → User documents with bcrypt-hashed password and hint
//   ft_<name>_<user>    → UserData documents owned by that user
// The legacy collection is then renamed to `backups_legacy` with the
// plaintext `ft_users` / `ft_current_user` documents removed.
//
// Usage: npm run migrate   (safe to re-run; existing users are skipped)
const mongoose = require('mongoose');
const config   = require('../src/config');
const User     = require('../src/models/User');
const UserData = require('../src/models/UserData');

async function main() {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;

  const exists = await db.listCollections({ name: 'backups' }).hasNext();
  if (!exists) {
    console.log('No legacy `backups` collection — nothing to migrate.');
    return;
  }

  const legacy = db.collection('backups');
  const docs   = await legacy.find().toArray();
  const byKey  = new Map(docs.map(d => [d._id, d]));
  const legacyUsers = byKey.get('ft_users')?.value ?? [];

  for (const legacyUser of legacyUsers) {
    const username = String(legacyUser.username ?? '').trim();
    if (!username || !legacyUser.password) continue;

    let user = await User.findOne({ username });
    if (user) {
      console.log(`• ${username}: account already exists, skipping credentials`);
    } else {
      user = new User({ username });
      await user.setPassword(legacyUser.password);
      await user.setHint(legacyUser.passwordHint);
      await user.save();
      console.log(`• ${username}: account created`);
    }

    const suffix = `_${username}`;
    const ops = docs
      .filter(d => d._id.startsWith('ft_') && d._id.endsWith(suffix))
      .map(d => ({
        updateOne: {
          filter: { user: user._id, key: d._id },
          update: { $setOnInsert: { value: d.value, updatedAt: d.updatedAt ?? new Date() } },
          upsert: true,
        },
      }));
    if (ops.length) await UserData.bulkWrite(ops);
    console.log(`  ${ops.length} data keys migrated`);
  }

  await legacy.deleteMany({ _id: { $in: ['ft_users', 'ft_current_user'] } });
  await legacy.rename('backups_legacy');
  console.log('Legacy collection renamed to `backups_legacy` (plaintext credentials removed).');
}

main()
  .catch(err => { console.error('Migration failed:', err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
