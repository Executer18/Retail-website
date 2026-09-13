require('dotenv').config();
const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node wrangler.cjs [any wrangler command]');
  process.exit(0);
}

const wranglerCmd = `node ./node_modules/wrangler/bin/wrangler.js ${args.join(' ')}`;

try {
  execSync(wranglerCmd, { stdio: 'inherit' });
} catch (error) {
  console.error('Execution failed.');
}