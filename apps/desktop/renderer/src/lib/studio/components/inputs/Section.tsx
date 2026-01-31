import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <Card
      className={cn(
        'bg-neutral-800/30 border-neutral-700/50 py-0 gap-0',
        className
      )}
    >
      <CardHeader className="px-3 py-2 border-b border-neutral-700/50">
        <CardTitle className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-3 flex flex-col gap-2">
        {children}
      </CardContent>
    </Card>
  );
}
