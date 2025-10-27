import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { electron } from '@timmy-studio/electron-utils/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  /** 공통으로 merge 되는 설정 */
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'renderer/src'),
      '@main': path.resolve(__dirname, 'main'),
      '@preload': path.resolve(__dirname, 'preload'),
    },
  },
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    electron({
      main: {},
      preload: {},
      package: {
        appId: 'com.livemehere.timmy-studio',
        icon: './icons/icon.png',
        targets: ['mac'],
      },
    }),
  ],
});
