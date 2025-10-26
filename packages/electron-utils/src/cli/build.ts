#!/usr/bin/env node
import { build as viteBuild } from 'vite';
import { resolve } from 'node:path';

async function build() {
  try {
    console.log('📦 Building Electron app with Vite...');

    // Build main process
    await viteBuild({
      configFile: resolve(process.cwd(), 'vite.config.ts'),
      mode: 'production',
    });

    console.log('✅ Build completed!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
