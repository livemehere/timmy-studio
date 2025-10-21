import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    // vite
    "vite/index": "src/vite/index.ts",

    // ipc
    "ipc/index": "src/ipc/index.ts",
    "ipc/main": "src/ipc/main.ts",
    "ipc/preload": "src/ipc/preload.ts",
    "ipc/renderer": "src/ipc/renderer.d.ts",

    // utils
    "utils/main": "src/utils/main.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ["electron", "vite"],
  outDir: "dist",
});
