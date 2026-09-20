require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

let args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node wrangler.cjs [any wrangler command]');
  process.exit(0);
}

// Android Patch: Catch dev requests and route them to deploy on our cloud staging environment
if (args[0] === 'dev') {
  console.log('📱 Android Mode: Re-routing local dev server to Live Cloud Staging...');
  args = ['deploy', '--env', 'staging'];
}

// Bind directly to your local project directory's binary path
const wranglerRawPath = path.resolve(__dirname, 'node_modules/wrangler/bin/wrangler.js');
const wranglerCmd = `node "${wranglerRawPath}" ${args.join(' ')}`;

try {
  console.log(`🏃 Executing: wrangler ${args.join(' ')}`);
  // Runs the command and safely outputs cloud URLs to your terminal
  execSync(wranglerCmd, { stdio: 'inherit' });
} catch (error) {
  console.error('\n⚠️ Process exited.');
}
