#!/usr/bin/env node
import { spawn } from 'node:child_process';

process.env.ELECTRON_PREVIEW = '1';

const electron = spawn('electron', ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

electron.on('exit', (code) => {
  process.exit(code || 0);
});
