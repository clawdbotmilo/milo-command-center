/**
 * PM2 Ecosystem Configuration for Milo Command Center
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 start ecosystem.config.cjs --only village-simulation
 *   pm2 start ecosystem.config.cjs --only milo-server
 *   
 * Monitoring:
 *   pm2 monit
 *   pm2 logs village-simulation
 *   pm2 status
 */

module.exports = {
  apps: [
    {
      // Main server (Next.js + WebSocket)
      name: 'milo-server',
      script: 'server.js',
      cwd: __dirname,
      node_args: '--experimental-specifier-resolution=node',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      // Process management
      instances: 1,          // Single instance for WebSocket state
      exec_mode: 'fork',     // Fork mode (not cluster) for WebSocket
      
      // Restart behavior
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/milo-server-error.log',
      out_file: './logs/milo-server-out.log',
      merge_logs: true,
      
      // Memory management
      max_memory_restart: '500M'
    },
    
    {
      // Background simulation service (standalone)
      name: 'village-simulation',
      script: 'simulation-service.js',
      cwd: __dirname,
      node_args: '--experimental-specifier-resolution=node',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        VERBOSE: 'false'
      },
      env_development: {
        NODE_ENV: 'development',
        VERBOSE: 'true'
      },
      
      // Process management
      instances: 1,
      exec_mode: 'fork',
      
      // Restart behavior - more resilient for background service
      autorestart: true,
      watch: false,
      max_restarts: 50,        // Allow more restarts
      min_uptime: '5s',
      restart_delay: 2000,
      
      // Cron restart at 4 AM daily for cleanup
      cron_restart: '0 4 * * *',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/village-sim-error.log',
      out_file: './logs/village-sim-out.log',
      merge_logs: true,
      
      // Memory management
      max_memory_restart: '200M'
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/milo-command-center.git',
      path: '/home/ubuntu/clawd/milo-command-center',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production'
    }
  }
};
