const UserData = require('../models/UserData');

// A user may only store their own localStorage keys: `ft_<name>_<username>`.
const ownsKey = (user, key) => key.startsWith('ft_') && key.endsWith(`_${user.username}`);

// Upsert each of the user's keys in `data`; other keys are ignored.
async function save(user, data) {
  const updatedAt = new Date();
  const ops = Object.entries(data)
    .filter(([key]) => ownsKey(user, key))
    .map(([key, value]) => ({
      updateOne: {
        filter: { user: user._id, key },
        update: { $set: { value, updatedAt } },
        upsert: true,
      },
    }));
  if (ops.length) await UserData.bulkWrite(ops);
  return { savedAt: updatedAt.toISOString(), keys: ops.length };
}

// All of the user's keys merged into one object, plus the most recent save time.
async function load(user) {
  const docs = await UserData.find({ user: user._id }).lean();
  if (!docs.length) return { data: null, savedAt: null };
  const data    = Object.fromEntries(docs.map(d => [d.key, d.value]));
  const savedAt = new Date(Math.max(...docs.map(d => d.updatedAt))).toISOString();
  return { savedAt, data };
}

module.exports = { save, load };
