import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-3 bg-neutral-800/30 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider pb-1 border-b border-neutral-700/50">
        {title}
      </h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
