export interface RealTimeInputProps<T = string> {
  icon?: React.ReactNode;
  defaultValue: T;
  onChange?: (value: T) => void;
  readOnly?: boolean;
  onInteractionStart?: () => void;
  onCommit?: (v: T) => void;
  className?: string;
}
