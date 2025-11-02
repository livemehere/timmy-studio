import { useEffect, useState } from 'react';

export default function VideoPlayerPage() {
  const [path, setPath] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <div className="p-4">
      <div>path: {path}</div>
      {error && <div className="text-red-500 mb-2">Error: {error}</div>}
      <video
        src={path}
        autoPlay
        controls
        onError={(e) => {
          const video = e.currentTarget;
          console.error('Video error:', {
            error: video.error,
            code: video.error?.code,
            message: video.error?.message,
            networkState: video.networkState,
            readyState: video.readyState,
          });
          setError(
            `Code: ${video.error?.code}, Message: ${video.error?.message}`
          );
        }}
        onLoadedMetadata={(e) => {
          console.log('Video metadata loaded:', {
            duration: e.currentTarget.duration,
            videoWidth: e.currentTarget.videoWidth,
            videoHeight: e.currentTarget.videoHeight,
          });
          setError(undefined);
        }}
      ></video>
      <canvas className="border w-full" />
      <hr className="my-4" />
      <input
        type="file"
        className="border border-neutral-600 p-1 pl-2 cursor-pointer hover:bg-neutral-800"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file) return;
            const filePath = window.app.getPathForFile(file);
            setPath(`source://open/?path=${encodeURIComponent(filePath)}`);
          }
        }}
      />
    </div>
  );
}
