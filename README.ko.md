<div align="center">

[English](./README.md) | [한국어](./README.ko.md)

<img src="./apps/desktop/icons/icon.png" alt="Timmy Studio 아이콘" width="96" />

# Timmy Studio

로컬 데스크톱 영상 편집기.

</div>

## 미리보기

![Timmy Studio 편집기](./docs/screenshots/editor-preview.png)

## 현재

- 비디오, 오디오, 이미지, 텍스트, 도형을 올릴 수 있는 멀티트랙 타임라인
- 화면에서 바로 위치와 크기를 조절하는 PixiJS 프리뷰
- 파형, 필름스트립, 프록시, 자동 저장, FFmpeg 내보내기
- 프레임 렌더링과 시킹 실험

## 환경

- macOS
- Node.js 22
- pnpm 10
- `apps/desktop/extra-resources`의 FFmpeg와 보조 실행 파일

## 명령어

```bash
pnpm install
pnpm dev
```

```bash
pnpm build
pnpm --filter ./apps/desktop test
```

## 메모

- [개발 메모](./DEVELOPMENT.ko.md)
- [편집기 렌더링 파이프라인](./docs/editor-rendering-pipeline.ko.md)
- [Studio 상태 관리 리팩터링](./apps/desktop/renderer/REFACTORING.ko.md)
- Studio 코드: `apps/desktop/renderer/src/lib/studio`
