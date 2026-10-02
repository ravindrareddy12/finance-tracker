const mongoose = require('mongoose');
const config   = require('./index');

async function connectDB() {
  await mongoose.connect(config.mongoUri);
  console.log(`MongoDB connected (db: ${mongoose.connection.name})`);
}

async function disconnectDB() {
  await mongoose.disconnect();
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, disconnectDB, isDBConnected };
