import type { IAsset } from '@/lib/studio/domains/Asset/types';
import { AssetItem } from '@/lib/studio/domains/Asset/components/AssetItem';
import { FolderOpen } from 'lucide-react';
import { useDocStore } from '@/lib/studio/hooks/useStudioStores';
import { useEngineStore } from '@/lib/studio/hooks/useStudioStores';
import { Track } from '@/lib/studio/domains/Track/Track';
import { Clip } from '@/lib/studio/domains/Clip/Clip';
import type { ITrack } from '@/lib/studio/domains/Track/types';
import type { IClip } from '@/lib/studio/domains/Clip/types';
import { motion } from 'motion/react';

interface AssetsProps {
  assets: IAsset[];
  emptyMessage?: string;
  showImport?: boolean;
  title?: string;
}

export function AssetList({
  assets,
  emptyMessage = 'No assets',
  showImport = false,
}: AssetsProps) {
  const addClip = useDocStore((state) => state.addClip);
  const addTrack = useDocStore((state) => state.addTrack);
  const tracks = useDocStore((state) => state.tracks);
  const removeAsset = useDocStore((state) => state.removeAsset);
  const timer = useEngineStore((state) => state.timer)!;

  const handleAddToTrack = (
    asset: IAsset,
    options: { position: 'currentTime' | 'endOfTrack' }
  ) => {
    const { position } = options;

    // 트랙 타입 결정
    const trackType = Track.convertAssetTypeToTrackType(asset.type);
    const candidateTracks = tracks
      .filter((t) => t.type === trackType)
      .sort((a, b) => a.zIndex - b.zIndex);

    // 클립 생성
    let newClip: IClip;

    switch (asset.type) {
      case 'video':
      case 'image':
      case 'animated-image':
      case 'audio':
        newClip = Clip.createFromAsset(asset);
        break;
      case 'shape':
        newClip = Clip.createShape(asset.shapeData);
        break;
      case 'text':
        newClip = Clip.createText(asset.textData);
        break;
      default:
        return;
    }

    const duration = newClip.endTime - newClip.startTime;

    if (position === 'currentTime') {
      // currentTime 위치에 배치
      const currentTime = timer.currentMs;

      // startTime 을 바꾸면서, endTime 을 duration 만큼 같이 바꿔줌
      newClip.startTime = currentTime;
      newClip.endTime = currentTime + duration;

      // 같은 타입의 트랙을 zIndex 낮은 순서대로 찾기

      let targetTrack: ITrack | undefined;

      // 충돌하지 않는 트랙 찾기
      for (const track of candidateTracks) {
        const hasCollision = track.clips.some((clip) => {
          return !(
            newClip.endTime <= clip.startTime ||
            newClip.startTime >= clip.endTime
          );
        });

        if (!hasCollision) {
          targetTrack = track;
          break;
        }
      }

      // 충돌하지 않는 트랙이 없으면 새로 생성
      if (!targetTrack) {
        const newTrack = Track.create(trackType);
        addTrack(newTrack);
        targetTrack = newTrack;
      }

      addClip(targetTrack.id, newClip);
    } else {
      let targetTrack: ITrack | undefined;
      let maxEndTime = 0;

      if (candidateTracks.length === 0) {
        // 트랙이 없으면 새로 생성
        const newTrack = Track.create(trackType);
        addTrack(newTrack);
        targetTrack = newTrack;
      } else {
        // 가장 마지막 endTime을 가진 트랙 찾기 (zIndex 낮은 순서 우선)
        for (const track of candidateTracks) {
          const trackEndTime = Track.getLastestClipEndTime(track);
          if (trackEndTime >= maxEndTime) {
            maxEndTime = trackEndTime;
            targetTrack = track;
          }
        }
        // candidateTracks가 비어있지 않으면 항상 targetTrack이 할당됨
      }

      const endTime = Track.getLastestClipEndTime(targetTrack!);
      newClip.startTime = endTime;
      newClip.endTime = endTime + duration;

      addClip(targetTrack!.id, newClip);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with optional import button */}

      {/* Content */}
      {assets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral-500">
          <div className="w-12 h-12 rounded-xl bg-neutral-800/50 flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-neutral-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-400">
              {emptyMessage}
            </p>
            {showImport && (
              <p className="text-xs text-neutral-500 mt-1">
                Upload or drop files to add assets
              </p>
            )}
          </div>
        </div>
      ) : (
        <motion.div
          layout
          className="flex-1 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 content-start"
        >
          {assets.map((asset) => (
            <AssetItem
              key={asset.id}
              asset={asset}
              onAddToTrack={handleAddToTrack}
              onDelete={() => removeAsset(asset.id)}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
