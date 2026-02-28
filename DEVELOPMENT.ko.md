# 개발 메모

[English](./DEVELOPMENT.md) | [한국어](./DEVELOPMENT.ko.md)

pnpm과 Turborepo를 쓰는 워크스페이스다. 크게 두 부분으로 나뉜다.

```text
apps/desktop/            Electron 앱
packages/electron-utils/ 빌드와 IPC 공용 코드
```

## 자주 쓰는 명령어

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm --filter ./apps/desktop test
```

`pnpm dev`는 `electron-utils`를 먼저 빌드한 뒤 해당 패키지의 감시 모드와 데스크톱 앱을 함께 실행한다. Turborepo TUI에서는 방향키로 작업을 옮겨 보고 `Ctrl+C`로 전부 종료한다.

하나만 따로 실행할 때:

```bash
pnpm --filter @timmy-studio/electron-utils build
pnpm --filter ./apps/desktop dev
```

빌드 캐시가 꼬인 것 같을 때:

```bash
pnpm turbo run build --force
```

내부 패키지는 `workspace:*`로 연결한다. 빌드 결과와 Turborepo 캐시는 소스가 아니므로 커밋하지 않는다.
