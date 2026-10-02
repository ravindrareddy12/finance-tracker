const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const config = {
  port:         Number(process.env.PORT) || 3001,
  mongoUri:     process.env.MONGODB_URI,
  jwtSecret:    process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

for (const [name, value] of [['MONGODB_URI', config.mongoUri], ['JWT_SECRET', config.jwtSecret]]) {
  if (!value) throw new Error(`${name} is not set — add it to backend/.env`);
}

module.exports = config;
