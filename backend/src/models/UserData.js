const { Schema, model } = require('mongoose');

// One document per (user, browser localStorage key), e.g. `ft_transactions_<username>`.
const userDataSchema = new Schema(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key:       { type: String, required: true },
    value:     { type: Schema.Types.Mixed, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'userdata', versionKey: false, minimize: false }
);

userDataSchema.index({ user: 1, key: 1 }, { unique: true });

module.exports = model('UserData', userDataSchema);
