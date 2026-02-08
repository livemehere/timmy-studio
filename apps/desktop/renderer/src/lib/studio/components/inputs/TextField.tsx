import { RtTextInput } from '@/lib/motion-input';

interface TextFieldProps {
  label: string;
}

export function TextField({
  label,
  ...props
}: TextFieldProps & React.ComponentProps<typeof RtTextInput>) {
  return (
    <div className="flex items-center gap-3 h-[30px]">
      <span className="text-neutral-400 w-24 shrink-0 text-xs">{label}</span>
      <RtTextInput {...props} className="h-full flex-1" />
    </div>
  );
}
