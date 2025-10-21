import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "node:path";
import { electron } from "@timmy-studio/electron-utils/vite";

export default defineConfig({
  resolve: {
    alias: {
      "@renderer": path.resolve(__dirname, "renderer/src"),
      "@main": path.resolve(__dirname, "main"),
      "@preload": path.resolve(__dirname, "preload"),
    },
  },
  plugins: [
    electron({
      main: {},
      preload: {},
      renderer: {
        plugins: [
          react({
            babel: {
              plugins: [["babel-plugin-react-compiler"]],
            },
          }),
        ],
      },
    }),
  ],
});
