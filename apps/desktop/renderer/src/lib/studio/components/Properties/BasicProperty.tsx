import { InputField, ToggleField } from '../inputs';

interface BasicPropertyProps {
  name: string;
  enabled: boolean;
  onChangeName: (value: string) => void;
  onChangeEnabled: (checked: boolean) => void;
  onChanged?: () => void;
}

export function BasicProperty({
  name,
  enabled,
  onChangeName,
  onChangeEnabled,
  onChanged,
}: BasicPropertyProps) {
  return (
    <div className="space-y-2">
      <InputField
        label="Name"
        value={name}
        onChange={(value) => {
          onChangeName(value);
          onChanged?.();
        }}
      />
      <ToggleField
        label="Enabled"
        checked={enabled}
        onChange={(checked) => {
          onChangeEnabled(checked);
          onChanged?.();
        }}
      />
    </div>
  );
}
