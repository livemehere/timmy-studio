import { css } from '@emotion/react';
import { DecorativeBox } from '@renderer/components/DecorativeBox';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setOpen((prev) => !prev), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ padding: '20px' }}>
      <h1>Home Page</h1>
      <div className="w-16 h-16">
        <DecorativeBox>hello</DecorativeBox>
      </div>
    </div>
  );
}
