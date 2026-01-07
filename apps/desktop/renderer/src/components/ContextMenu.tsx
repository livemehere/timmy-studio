import { ContextMenu as RadixContextMenu } from 'radix-ui';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface ContextMenuSection {
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  children: ReactNode;
  sections: ContextMenuSection[];
}

export function ContextMenu({ children, sections }: ContextMenuProps) {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>{children}</RadixContextMenu.Trigger>

      <RadixContextMenu.Portal>
        <RadixContextMenu.Content
          className="min-w-[200px] bg-neutral-800 rounded-md overflow-hidden p-1 shadow-lg border border-neutral-700"
          sideOffset={5}
        >
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {sectionIndex > 0 && (
                <RadixContextMenu.Separator className="h-[1px] bg-neutral-700 my-1" />
              )}
              {section.items.map((item, itemIndex) => (
                <RadixContextMenu.Item
                  key={itemIndex}
                  className={`
                    flex items-center gap-3 px-2 py-1.5 text-sm rounded
                    outline-none cursor-pointer select-none
                    ${
                      item.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-neutral-700'
                    }
                    ${item.variant === 'destructive' ? 'text-red-400' : 'text-neutral-100'}
                  `}
                  onSelect={item.onSelect}
                  disabled={item.disabled}
                >
                  {item.icon && <item.icon size={16} />}
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-neutral-400">
                      {item.shortcut}
                    </span>
                  )}
                </RadixContextMenu.Item>
              ))}
            </div>
          ))}
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}
