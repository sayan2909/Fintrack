const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('----------------------------------------------------');
console.log('🚀 Starting FinTrack Services...');
console.log('   Backend API:  http://localhost:5000');
console.log('   Frontend App: http://localhost:3000');
console.log('----------------------------------------------------\n');

function startProcess(name, dir, port) {
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(rootDir, dir),
    stdio: 'pipe',
    shell: true,
  });

  const prefix = `[${name}] `;
  child.stdout.on('data', (data) => {
    process.stdout.write(data.toString().split('\n').map(l => l ? `${prefix}${l}` : l).join('\n'));
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data.toString().split('\n').map(l => l ? `${prefix}${l}` : l).join('\n'));
  });

  child.on('close', (code) => {
    console.log(`${prefix}exited with code ${code}`);
  });

  return child;
}

const backend = startProcess('backend', 'backend', 5000);
const frontend = startProcess('frontend', 'frontend', 3000);

function cleanup() {
  console.log('\nShutting down servers...');
  if (isWindows) {
    if (backend.pid) spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
    if (frontend.pid) spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
  } else {
    backend.kill();
    frontend.kill();
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
