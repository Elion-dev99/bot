module.exports = {
  apps: [
    {
      name: "collection-discord-bot",
      script: "src/index.js",
      autorestart: true,
      max_restarts: 50,
      min_uptime: "10s",
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
