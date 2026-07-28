const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building admin panel...');
execSync('cd admin && npm install && npm run build', { stdio: 'inherit' });

console.log('Copying admin to frontend/public/admin...');
const adminDist = path.join(__dirname, 'admin', 'dist');
const frontendPublicAdmin = path.join(__dirname, 'frontend', 'public', 'admin');

if (fs.existsSync(frontendPublicAdmin)) {
  fs.rmSync(frontendPublicAdmin, { recursive: true });
}
fs.mkdirSync(frontendPublicAdmin, { recursive: true });
fs.cpSync(adminDist, frontendPublicAdmin, { recursive: true });

console.log('Building frontend...');
execSync('cd frontend && npm install && npm run build', { stdio: 'inherit' });

console.log('Build complete! Upload frontend/dist folder to Netlify.');