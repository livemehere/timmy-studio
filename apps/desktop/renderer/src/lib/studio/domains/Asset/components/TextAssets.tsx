import { Button } from '@/components/Button';
import { useDocStore } from '@/lib/studio/hooks/useStudioStores';
import { Track } from '@/lib/studio/domains/Track/Track';
import { Clip } from '@/lib/studio/domains/Clip/Clip';

export function TextAssets() {
  const addClip = useDocStore((state) => state.addClip);
  const addTrack = useDocStore((state) => state.addTrack);
  const tracks = useDocStore((state) => state.tracks);

  const handleAddDefaultText = () => {
    // 1. 그래픽 트랙 찾기 또는 생성
    let targetTrack = Track.findFirstTrack(tracks, 'graphic');

    if (!targetTrack) {
      const newTrack = Track.create('graphic');
      addTrack(newTrack);
      targetTrack = newTrack;
    }

    // 2. 텍스트 클립 생성
    const newClip = Clip.createText({
      content: '기본 텍스트',
      fontSize: 50,
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'left',
    });

    // 3. 트랙의 마지막 위치에 추가 (겹치지 않게)
    const lastEndTime = Track.getLastestClipEndTime(targetTrack);
    newClip.startTime = lastEndTime;
    newClip.endTime = lastEndTime + Clip.DEFAULT_CLIP_DURATION_MS;

    addClip(targetTrack.id, newClip);
  };

  return (
    <div className="p-4 grid grid-cols-2 gap-2">
      <Button
        variant="secondary"
        className="h-24 flex flex-col gap-2"
        onClick={handleAddDefaultText}
      >
        <span className="text-2xl font-bold">T</span>
        <span className="text-xs text-neutral-400">기본 텍스트</span>
      </Button>
    </div>
  );
}
