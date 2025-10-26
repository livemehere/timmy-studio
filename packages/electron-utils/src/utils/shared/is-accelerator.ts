const modifiers: RegExp =
  /^(Command|Cmd|Control|Ctrl|CommandOrControl|CmdOrCtrl|Alt|Option|AltGr|Shift|Super)$/;

const keyCodes: RegExp =
  /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;

/**
 * 주어진 가속기 문자열(e.g. "Ctrl+Shift+K")이 유효한지 검사합니다.
 * - 마지막 파트에는 반드시 키(고유) 하나가 있어야 합니다.
 * - 나머지는 모디파이어여야 합니다.
 */
export default function validateAccelerator(str: string): boolean {
  const parts = str.split('+');
  let keyFound = false;

  return parts.every((val, index) => {
    const isKey = keyCodes.test(val);
    const isModifier = modifiers.test(val);

    if (isKey) {
      // 키는 하나만 허용
      if (keyFound) return false;
      keyFound = true;
    }

    // 마지막 파트까지 왔는데 키가 하나도 없으면 실패
    if (index === parts.length - 1 && !keyFound) return false;

    return isKey || isModifier;
  });
}
