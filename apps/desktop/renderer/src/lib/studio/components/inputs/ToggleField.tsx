import { Switch } from '@/components/ui/switch';

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-400 text-xs">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} size="sm" />
    </div>
  );
}
