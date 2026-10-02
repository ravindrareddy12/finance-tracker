const config = require('./src/config');
const app    = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');
const { getAllNavs }              = require('./src/services/mutualFundService');

async function start() {
  const server = app.listen(config.port, () => {
    console.log(`Finance Tracker backend running on http://localhost:${config.port}`);
  });

  // DB failures are non-fatal: market-data routes keep working and
  // DB-backed routes answer 503 until the connection is up.
  connectDB()
    .catch(err => console.error('MongoDB connection failed:', err.message));

  // Pre-warm AMFI NAV cache so first requests don't wait on the download
  getAllNavs()
    .then(schemes => console.log(`AMFI NAV cache warm: ${schemes.length} schemes loaded`))
    .catch(err => console.warn('AMFI pre-warm failed (non-fatal):', err.message));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => disconnectDB().finally(() => process.exit(0)));
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
