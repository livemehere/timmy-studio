# Timmy Desktop

[English](./README.md) | [한국어](./README.ko.md)

The Electron app for Timmy Studio.

```bash
pnpm dev
pnpm build
pnpm test
pnpm package
```

The renderer is React 19. The editing canvas uses PixiJS, and FFmpeg handles media work that is better kept outside the UI process.

Next experiments:

- Seek with extracted `VideoFrame` objects instead of a video element
- Feed continuously rendered frames into an FFmpeg pipe and measure the cost
