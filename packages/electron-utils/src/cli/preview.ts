#!/usr/bin/env node
import { spawn } from 'node:child_process';

const electron = spawn('electron', ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

electron.on('exit', (code) => {
  process.exit(code || 0);
});
