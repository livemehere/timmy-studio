import { TextField, ToggleField } from '../inputs';

interface BasicPropertyProps {
  name: string;
  enabled: boolean;
  onChangeName: (value: string) => void;
  onChangeEnabled: (checked: boolean) => void;
}

export function BasicProperty({
  name,
  enabled,
  onChangeName,
  onChangeEnabled,
}: BasicPropertyProps) {
  return (
    <div className="space-y-3">
      <TextField label="Name" value={name} onChange={onChangeName} />
      <ToggleField
        label="Enabled"
        checked={enabled}
        onChange={onChangeEnabled}
      />
    </div>
  );
}
