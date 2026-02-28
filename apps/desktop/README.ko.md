# Timmy Desktop

[English](./README.md) | [한국어](./README.ko.md)

Timmy Studio의 Electron 앱이다.

```bash
pnpm dev
pnpm build
pnpm test
pnpm package
```

renderer는 React 19로 만들었다. 편집 화면은 PixiJS를 사용하고, UI 프로세스 밖에서 처리하는 편이 나은 미디어 작업은 FFmpeg에 맡긴다.

다음 실험:

- 비디오 엘리먼트 대신 추출한 `VideoFrame`으로 시킹하기
- 연속 렌더링한 프레임을 FFmpeg 파이프로 넘기고 비용 측정하기
