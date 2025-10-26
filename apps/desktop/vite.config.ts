import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { electron } from '@timmy-studio/electron-utils/vite';

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
    /** 개별 설정 */
    electron({
      main: {},
      preload: {},
      renderer: {
        plugins: [
          react({
            babel: {
              plugins: [['babel-plugin-react-compiler']],
            },
          }),
        ],
      },
      packge: {
        appId: 'com.livemehere.timmy-studio',
        icon: './icons/icon.png',
        targets: ['mac'],
      },
    }),
  ],
});
