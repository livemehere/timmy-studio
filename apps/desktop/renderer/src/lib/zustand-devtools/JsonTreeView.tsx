import { useState } from 'react';
import { ChevronRight, ChevronDown, Braces, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonTreeViewProps {
  data: any;
  highlightedKeys?: Set<string>;
  path?: string;
}

export function JsonTreeView({
  data,
  highlightedKeys = new Set(),
  path = '',
}: JsonTreeViewProps) {
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);

  if (data === null) {
    return <span className="text-neutral-600">null</span>;
  }

  if (typeof data === 'function') {
    return <span className="text-neutral-500 italic">fn()</span>;
  }

  if (typeof data !== 'object') {
    const isHighlighted = highlightedKeys.has(path);
    return (
      <span
        className={cn(
          'transition-colors duration-1000',
          typeof data === 'string' ? 'text-green-400' : 'text-blue-400',
          isHighlighted && 'bg-yellow-500/20 text-yellow-300'
        )}
      >
        {typeof data === 'string' ? (
          <Quote size={12} className="inline opacity-50" />
        ) : null}
        {typeof data === 'string' ? `"${data}"` : String(data)}
        {typeof data === 'string' ? (
          <Quote size={12} className="inline opacity-50 ml-0.5" />
        ) : null}
      </span>
    );
  }

  const [expanded, setExpanded] = useState(path.length < 20);

  return (
    <div className="ml-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="text-neutral-400 font-mono text-xs">
          {isArray ? (
            <>
              <span className="text-yellow-500">Array</span>
              {`(${data.length})`}
            </>
          ) : (
            <>
              <Braces size={14} className="inline mr-1 text-purple-500" />
              {`{`}
              <span className="text-neutral-600 ml-1">Object</span>
              {`}`}
            </>
          )}
        </span>
      </div>

      {expanded && (
        <div className="ml-4 border-l border-neutral-800 pl-2">
          {Object.entries(data).map(([key, value]) => {
            const valuePath = path ? `${path}.${key}` : key;
            const keyIsHighlighted = highlightedKeys.has(valuePath);

            return (
              <div key={key} className="py-0.5">
                <span
                  className={cn(
                    'mr-2 font-mono text-xs',
                    keyIsHighlighted &&
                      'bg-yellow-500/20 text-yellow-300 rounded px-1'
                  )}
                >
                  {isArray ? (
                    <span className="text-neutral-600">{Number(key) + 1}</span>
                  ) : (
                    <span className="text-orange-400">{key}</span>
                  )}
                  :
                </span>
                <JsonTreeView
                  data={value}
                  highlightedKeys={highlightedKeys}
                  path={valuePath}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
