export function didClipBecomeVisible(params: {
  wasVisible: boolean;
  isVisible: boolean;
}): boolean {
  return params.isVisible && !params.wasVisible;
}

export function shouldStartVideoPlayback(params: {
  playStateChanged: boolean;
  clipBecameVisible: boolean;
}): boolean {
  return params.playStateChanged || params.clipBecameVisible;
}
