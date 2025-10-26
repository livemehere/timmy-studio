#!/usr/bin/env node
import { build as viteBuild } from 'vite';
import { resolve } from 'node:path';

async function build() {
  try {
    console.log('📦 Vite로 Electron 앱 빌드 중...');

    // Build main process
    await viteBuild({
      configFile: resolve(process.cwd(), 'vite.config.ts'),
      mode: 'production',
    });

    console.log('✅ 빌드 완료!');
  } catch (error) {
    console.error('❌ 빌드 실패:', error);
    process.exit(1);
  }
}

build();
