import { useEffect, useState } from 'react';

export default function VideoPlayerPage() {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (!file) return;
    const path = window.app.getPathForFile(file);
    console.log('File path:', path);
  }, [file]);
  return (
    <div className="p-4">
      <canvas className="border w-full" />
      <hr className="my-4" />
      <input
        type="file"
        className="border border-neutral-600 p-1 pl-2 cursor-pointer hover:bg-neutral-800"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}
