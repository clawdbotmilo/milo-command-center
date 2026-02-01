#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('🌱 Generating static data for Milo Command Center...');

// Get cron jobs
let cron = [];
try {
  const result = execSync('clawdbot cron list --json 2>/dev/null', { encoding: 'utf8' });
  const data = JSON.parse(result);
  const jobs = Array.isArray(data) ? data : data.jobs || [];
  
  cron = jobs.map(job => {
    let schedule = 'Unknown';
    if (job.schedule?.kind === 'cron') {
      schedule = job.schedule.expr;
    } else if (job.schedule?.kind === 'every') {
      const ms = job.schedule.everyMs;
      if (ms >= 3600000) schedule = `Every ${ms / 3600000}h`;
      else if (ms >= 60000) schedule = `Every ${ms / 60000}m`;
      else schedule = `Every ${ms / 1000}s`;
    }
    
    return {
      name: job.name || 'Unnamed',
      enabled: job.enabled !== false,
      schedule,
      nextRun: job.state?.nextRunAtMs 
        ? new Date(job.state.nextRunAtMs).toLocaleString()
        : null
    };
  });
  console.log(`✅ Found ${cron.length} cron jobs`);
} catch (e) {
  console.log('⚠️ Could not fetch cron jobs (clawdbot not available)');
}

// Get system info
let system = {
  hostname: os.hostname(),
  os: `${os.type()} ${os.release()}`,
  nodeVersion: process.version,
  uptime: 'Unknown',
  model: 'claude-opus-4-5',
  channel: 'telegram',
  disk: { total: '?', used: '?', usedPercent: '?' },
  memory: { total: '?', used: '?', usedPercent: '?' }
};

try {
  const diskInfo = execSync("df -h / | tail -1", { encoding: 'utf8' }).split(/\s+/);
  const memInfo = execSync("free -h | grep Mem", { encoding: 'utf8' }).split(/\s+/);
  const memPercent = execSync("free | grep Mem | awk '{printf \"%.0f%%\", $3/$2 * 100}'", { encoding: 'utf8' });
  const uptime = execSync("uptime -p", { encoding: 'utf8' }).trim();
  
  system = {
    ...system,
    uptime,
    disk: {
      total: diskInfo[1] || '?',
      used: diskInfo[2] || '?',
      usedPercent: diskInfo[4] || '?'
    },
    memory: {
      total: memInfo[1] || '?',
      used: memInfo[2] || '?',
      usedPercent: memPercent || '?'
    }
  };
  console.log('✅ Gathered system info');
} catch (e) {
  console.log('⚠️ Could not gather system info');
}

// Skills list
const skills = [
  { name: 'github', emoji: '🐙' },
  { name: 'himalaya', emoji: '📧' },
  { name: 'notion', emoji: '📝' },
  { name: 'slack', emoji: '💬' },
  { name: 'tmux', emoji: '🖥️' },
  { name: 'weather', emoji: '🌤️' },
  { name: 'skill-creator', emoji: '🛠️' },
  { name: 'bluebubbles', emoji: '💭' }
];

// Write to public directory
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const staticData = {
  generatedAt: new Date().toISOString(),
  system,
  cron,
  skills
};

fs.writeFileSync(
  path.join(publicDir, 'static-data.json'),
  JSON.stringify(staticData, null, 2)
);

console.log('✅ Static data written to public/static-data.json');
