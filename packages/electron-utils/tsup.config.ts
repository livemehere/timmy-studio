import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "ipc/index": "src/ipc/index.ts",
    "ipc/renderer": "src/ipc/renderer.d.ts",
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
