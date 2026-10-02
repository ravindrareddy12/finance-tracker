const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// The password hint doubles as the recovery answer for "Forgot password", so
// it is hashed like the password and never sent back to the client.
const userSchema = new Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 40 },
    passwordHash: { type: String, required: true },
    hintHash:     { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
};

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Hints are compared case-insensitively, as before
userSchema.methods.setHint = async function (hint) {
  const normalized = hint?.trim().toLowerCase();
  this.hintHash = normalized ? await bcrypt.hash(normalized, SALT_ROUNDS) : null;
};

userSchema.methods.compareHint = function (hint) {
  if (!this.hintHash || !hint) return Promise.resolve(false);
  return bcrypt.compare(hint.trim().toLowerCase(), this.hintHash);
};

userSchema.methods.toPublic = function () {
  return { id: this._id.toString(), username: this.username, hasHint: Boolean(this.hintHash) };
};

module.exports = model('User', userSchema);
