import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Starting application...');

// First run ensure-users.js to setup default users
const ensureUsers = spawn('node', [path.join(__dirname, 'ensure-users.js')]);

ensureUsers.stdout.on('data', (data) => {
  console.log(`[ensure-users]: ${data}`);
});

ensureUsers.stderr.on('data', (data) => {
  console.error(`[ensure-users error]: ${data}`);
});

ensureUsers.on('close', (code) => {
  console.log(`ensure-users.js process exited with code ${code}`);
  
  if (code === 0) {
    console.log('Starting web server...');
    // After ensure-users.js completes successfully, start the main server
    const server = spawn('node', [path.join(__dirname, 'index.js')]);
    
    server.stdout.on('data', (data) => {
      console.log(`[server]: ${data}`);
    });
    
    server.stderr.on('data', (data) => {
      console.error(`[server error]: ${data}`);
    });
    
    server.on('close', (code) => {
      console.log(`Web server process exited with code ${code}`);
      process.exit(code);
    });
  } else {
    console.error('Failed to ensure users exist. Exiting.');
    process.exit(code);
  }
});
