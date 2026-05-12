import { spawn } from 'child_process';
import path from 'path';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const root = path.resolve(new URL(import.meta.url).pathname, '..', '..');

function spawnProcess(name, args) {
  const child = spawn(npmCommand, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${name} terminated with signal ${signal}`);
    } else {
      console.log(`${name} exited with code ${code}`);
    }
    process.exit(code ?? 0);
  });

  return child;
}

console.log('Starting local development environment...');
spawnProcess('Backend', ['run', 'server']);
spawnProcess('Frontend', ['run', 'dev']);
