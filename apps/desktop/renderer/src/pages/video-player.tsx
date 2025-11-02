import { useEffect, useState } from 'react';

export default function VideoPlayerPage() {
  const [path, setPath] = useState<string | undefined>(undefined);

  return (
    <div className="p-4">
      <div>path: {path}</div>
      <video src={path} autoPlay controls></video>
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
            setPath(`source:${filePath}`);
          }
        }}
      />
    </div>
  );
}
