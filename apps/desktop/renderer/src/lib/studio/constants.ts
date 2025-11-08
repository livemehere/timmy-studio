export const PIXI_LABELS = {
  SCENE_CONTAINER: 'SCENE_CONTAINER',
};

export const CREATE_PIXI_LABEL = {
  track: (trackId: string) => `TRACK-${trackId}`,
  clip: (clipId: string) => `CLIP-${clipId}`,
};
