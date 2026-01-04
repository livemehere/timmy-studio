interface InputFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'color';
  readOnly?: boolean;
}

export function InputField({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
}: InputFieldProps) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-sm text-neutral-400 w-24 shrink-0">{label}</span>
      <input
        readOnly={readOnly}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={
          type === 'color'
            ? 'w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0'
            : 'flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors'
        }
      />
    </label>
  );
}
