require('dotenv').config();
const { execSync } = require('child_process');

const token = process.env.OPENVSX_TOKEN;

if (!token) {
  console.error('❌ OPENVSX_TOKEN is not set in .env');
  process.exit(1);
}

try {
  execSync(`ovsx publish --pat ${token}`, { stdio: 'inherit' });
} catch (err) {
  process.exit(1);
}
