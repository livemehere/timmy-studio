#!/usr/bin/env node
import { spawn } from 'node:child_process';

process.env.NODE_ENV = 'development';

const vite = spawn('vite', process.argv.slice(2), {
  stdio: 'inherit',
  shell: true,
});

vite.on('exit', (code) => {
  process.exit(code || 0);
});
