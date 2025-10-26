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
      // TODO: electron-builder 를 사용하여, 빌드하는 부분에서, 부분적으로 추상화한 옵션 넣기
      // packge:{}
    }),
  ],
});
