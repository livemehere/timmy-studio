import { TextField, ToggleField } from '../inputs';

interface BasicPropertyProps {
  defaultName: string;
  defaultEnabled: boolean;
  onCommitName: (value: string) => void;
  onCommitEnabled: (checked: boolean) => void;
}

export function BasicProperty({
  defaultName,
  defaultEnabled,
  onCommitName,
  onCommitEnabled,
}: BasicPropertyProps) {
  return (
    <div className="space-y-3">
      <TextField
        label="Name"
        defaultValue={defaultName}
        onCommit={onCommitName}
      />
      <ToggleField
        label="Enabled"
        checked={defaultEnabled}
        onChange={onCommitEnabled}
      />
    </div>
  );
}
