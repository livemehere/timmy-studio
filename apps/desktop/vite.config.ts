/// <reference types="vitest" />

import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { electron } from '@timmy-studio/electron-utils/vite';
import tailwindcss from '@tailwindcss/vite';

const resolve: UserConfig['resolve'] = {
  alias: {
    '@renderer': path.resolve(__dirname, 'renderer/src'),
    '@main': path.resolve(__dirname, 'main'),
    '@preload': path.resolve(__dirname, 'preload'),
  },
};

export default defineConfig({
  test: {},
  /** 공통으로 merge 되는 설정 */
  resolve,
  plugins: [
    tailwindcss(),
    react({
      babel: {
        // plugins: [['babel-plugin-react-compiler']],
      },
    }),
    electron({
      main: {
        resolve,
        ssr: {
          /* ESM -> CJS 로 바꿔버리는 효과 */
          noExternal: ['electron-store'],
        },
      },
      preload: {
        resolve,
      },
      package: {
        appId: 'com.livemehere.timmy-studio',
        icon: './icons/icon.png',
        targets: ['mac'],
      },
    }),
  ],
});
