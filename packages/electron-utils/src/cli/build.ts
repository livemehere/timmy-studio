#!/usr/bin/env node
import { spawn } from 'node:child_process';

async function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function build() {
  try {
    console.log('📦 Building TypeScript...');
    await runCommand('tsc', ['-b']);

    console.log('📦 Building with Vite...');
    await runCommand('vite', ['build', ...process.argv.slice(2)]);

    console.log('✅ Build completed!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
