import { defineConfig, build as viteBuild, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

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

function electron(options: {
  main: {};
  preload: {};
  renderer: import("vite").UserConfig;
}): import("vite").Plugin[] {
  const rootPath = process.cwd();
  const outDir = path.join(rootPath, "dist");

  let isServe = false;
  let devServer: import("vite").ViteDevServer;
  let app: import("child_process").ChildProcess;
  let sharedConfig: import("vite").UserConfig = {};

  async function buildBundle(
    sharedConfig: import("vite").UserConfig,
    entry: "main" | "preload",
    onEnded?: () => Promise<void>,
  ) {
    await viteBuild(
      mergeConfig(sharedConfig, {
        configFile: false, // 이걸 false 로 안하면, vite.config.ts 를 자동으로 불러와서, 무한루프에 빠진다.
        build: {
          emptyOutDir: false,
          minify: !isServe, // 최소한의 난독화인데, TODO: 암호화나, 난독화 추가하기
          ssr: true, // true 로 하면, node 관련 모듈을 externalize 하여, node 환경(타겟) 으로 빌드하는 효과를 낸다.
          target: "es2022",
          sourcemap: isServe, // 아둘레 기저시할 떄 쓸모있지 않을까..
          rollupOptions: {
            input: path.join(rootPath, `${entry}/index.ts`),
            output: {
              format: "cjs",
              entryFileNames: `${entry}.js`,
              dir: outDir,
            },
          },
          watch: isServe ? {} : undefined,
        },
        plugins: [
          {
            name: "on-ended",
            buildStart() {
              console.log(`🚀 ${entry} 빌드 시작`);
            },
            buildEnd() {
              console.log(`\n✅  ${entry} 빌드 완료`);
              onEnded?.();
            },
          },
        ],
      } as import("vite").UserConfig),
    );
  }

  return [
    {
      name: "vite-plugin-electron-renderer",
      config(config, { command }) {
        sharedConfig = {
          ...config,
          plugins: [], // plugin 은 중첩되면 안됨.
        };
        isServe = command === "serve";
        const baseConfig: import("vite").UserConfig = {
          root: "./renderer",
          build: {
            outDir: path.join(outDir, "renderer"),
          },
        };
        return mergeConfig(
          mergeConfig(sharedConfig, baseConfig),
          options.renderer,
        );
      },
      configureServer(server) {
        devServer = server;
        server.httpServer?.on("close", () => {
          console.log(`♻️ electron 을 재시작 합니다.`);
          app?.kill();
        });
        server.httpServer?.on("listening", () => {
          const address =
            server.httpServer!.address() as import("net").AddressInfo;
          process.env["RENDERER_URL"] = `http://localhost:${address.port}`;
        });
      },
    },
    {
      name: "vite-plugin-electron",
      async buildStart() {
        rmSync(outDir, { recursive: true, force: true });
        await buildBundle(
          sharedConfig,
          "main",
          isServe
            ? async () => {
                app?.kill();
                app = spawn("electron", ["."], {
                  stdio: "inherit",
                  shell: true,
                });
              }
            : undefined,
        );

        await buildBundle(
          sharedConfig,
          "preload",
          isServe
            ? async () => {
                devServer.ws.send({ type: "full-reload" });
              }
            : undefined,
        );
      },
    },
  ];
}
