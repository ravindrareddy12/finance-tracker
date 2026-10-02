module.exports = {
  apps: [
    {
      name: 'finance-backend',
      cwd: './backend',
      script: 'server.js',
      watch: false,
      env: { NODE_ENV: 'production', PORT: 3001 },
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'finance-frontend',
      cwd: './frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 3000 --host',
      watch: false,
      env: { NODE_ENV: 'development' },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
