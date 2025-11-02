import { toSourcePath } from '@timmy-studio/electron-utils/utils/renderer';
import { useState } from 'react';
import { VideoPlayer } from '@renderer/components/VideoPlayer';

export default function VideoPlayerPage() {
  const [path, setPath] = useState<string | undefined>(
    'source://open?path=%2FUsers%2Fdeveloper%2FDownloads%2F305657_small.mp4'
  );

  return (
    <div className="p-4">
      <div>path: {path}</div>
      <input
        type="file"
        className="border border-neutral-600 p-1 pl-2 cursor-pointer hover:bg-neutral-800"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file) return;
            const filePath = window.app.getPathForFile(file);
            setPath(toSourcePath(filePath));
          }
        }}
      />
      <hr />
      <VideoPlayer src={path} />
    </div>
  );
}
