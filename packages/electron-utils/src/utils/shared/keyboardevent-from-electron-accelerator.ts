/** 키보드 이벤트 상태 인터페이스 */
interface KeyboardEventState {
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  key?: string;
  code?: string;
}

/** Reducer 상태 인터페이스 */
interface ReducerState {
  accelerator: string;
  event: KeyboardEventState;
}

/** 지원되지 않는 타입 */
type UnsupportedType = Record<string, never>;

/** 수식어 키 매칭을 위한 정규표현식 */
const modifiers =
  /^(CommandOrControl|CmdOrCtrl|Command|Cmd|Control|Ctrl|AltGr|Option|Alt|Shift|Super)/i;
/** 키 코드 매칭을 위한 정규표현식 */
const keyCodes =
  /^(Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen|F24|F23|F22|F21|F20|F19|F18|F17|F16|F15|F14|F13|F12|F11|F10|F9|F8|F7|F6|F5|F4|F3|F2|F1|[0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]'])/i;
/** 플랫폼에서 지원되지 않는 키 조합을 나타내는 상수 */
const UNSUPPORTED: UnsupportedType = {};

/**
 * Command 수식어 처리 (macOS 전용)
 * @param accelerator - 가속기 문자열
 * @param event - 현재 이벤트 상태
 * @param modifier - 수식어 문자열
 * @returns 업데이트된 상태 또는 UNSUPPORTED
 */
function _command(
  accelerator: string,
  event: KeyboardEventState,
  modifier: string
): ReducerState | UnsupportedType {
  if (process.platform !== 'darwin') {
    return UNSUPPORTED;
  }

  if (event.metaKey) {
    throw new Error('Double `Command` modifier specified.');
  }

  return {
    event: Object.assign({}, event, { metaKey: true }),
    accelerator: accelerator.slice(modifier.length),
  };
}

/**
 * Super 수식어 처리
 * @param accelerator - 가속기 문자열
 * @param event - 현재 이벤트 상태
 * @param modifier - 수식어 문자열
 * @returns 업데이트된 상태
 */
function _super(
  accelerator: string,
  event: KeyboardEventState,
  modifier: string
): ReducerState {
  if (event.metaKey) {
    throw new Error('Double `Super` modifier specified.');
  }

  return {
    event: Object.assign({}, event, { metaKey: true }),
    accelerator: accelerator.slice(modifier.length),
  };
}

/**
 * CommandOrControl 수식어 처리 (macOS에서는 Command, 다른 OS에서는 Control)
 * @param accelerator - 가속기 문자열
 * @param event - 현재 이벤트 상태
 * @param modifier - 수식어 문자열
 * @returns 업데이트된 상태 또는 UNSUPPORTED
 */
function _commandorcontrol(
  accelerator: string,
  event: KeyboardEventState,
  modifier: string
): ReducerState | UnsupportedType {
  if (process.platform === 'darwin') {
    if (event.metaKey) {
      throw new Error('Double `Command` modifier specified.');
    }

    return {
      event: Object.assign({}, event, { metaKey: true }),
      accelerator: accelerator.slice(modifier.length),
    };
  }

  if (event.ctrlKey) {
    throw new Error('Double `Control` modifier specified.');
  }

  return {
    event: Object.assign({}, event, { ctrlKey: true }),
    accelerator: accelerator.slice(modifier.length),
  };
}

/**
 * Alt 수식어 처리 (Option은 macOS 전용)
 * @param accelerator - 가속기 문자열
 * @param event - 현재 이벤트 상태
 * @param modifier - 수식어 문자열
 * @returns 업데이트된 상태 또는 UNSUPPORTED
 */
function _alt(
  accelerator: string,
  event: KeyboardEventState,
  modifier: string
): ReducerState | UnsupportedType {
  if (modifier === 'option' && process.platform !== 'darwin') {
    return UNSUPPORTED;
  }

  if (event.altKey) {
    throw new Error('Double `Alt` modifier specified.');
  }

  return {
    event: Object.assign({}, event, { altKey: true }),
    accelerator: accelerator.slice(modifier.length),
  };
}

/**
 * Shift 수식어 처리
 * @param accelerator - 가속기 문자열
 * @param event - 현재 이벤트 상태
 * @param modifier - 수식어 문자열
 * @returns 업데이트된 상태
 */
function _shift(
  accelerator: string,
  event: KeyboardEventState,
  modifier: string
): ReducerState {
  if (event.shiftKey) {
    throw new Error('Double `Shift` modifier specified.');
  }

  return {
    event: Object.assign({}, event, { shiftKey: true }),
    accelerator: accelerator.slice(modifier.length),
  };
}

/**
 * Control 수식어 처리
 * @param accelerator - 가속기 문자열
 * @param event - 현재 이벤트 상태
 * @param modifier - 수식어 문자열
 * @returns 업데이트된 상태
 */
function _control(
  accelerator: string,
  event: KeyboardEventState,
  modifier: string
): ReducerState {
  if (event.ctrlKey) {
    throw new Error('Double `Control` modifier specified.');
  }

  return {
    event: Object.assign({}, event, { ctrlKey: true }),
    accelerator: accelerator.slice(modifier.length),
  };
}

/**
 * 수식어를 처리하는 함수
 * @param state - 현재 상태
 * @param modifier - 수식어 문자열
 * @returns 업데이트된 상태, UNSUPPORTED 또는 undefined
 */
function reduceModifier(
  { accelerator, event }: ReducerState,
  modifier: string
): ReducerState | UnsupportedType | undefined {
  switch (modifier) {
    case 'command':
    case 'cmd': {
      return _command(accelerator, event, modifier);
    }

    case 'super': {
      return _super(accelerator, event, modifier);
    }

    case 'control':
    case 'ctrl': {
      return _control(accelerator, event, modifier);
    }

    case 'commandorcontrol':
    case 'cmdorctrl': {
      return _commandorcontrol(accelerator, event, modifier);
    }

    case 'option':
    case 'altgr':
    case 'alt': {
      return _alt(accelerator, event, modifier);
    }

    case 'shift': {
      return _shift(accelerator, event, modifier);
    }

    default:
      console.error(modifier);
  }
}

/**
 * Plus(+) 기호를 처리하는 함수
 * @param state - 현재 상태
 * @returns 업데이트된 상태
 */
function reducePlus({ accelerator, event }: ReducerState): ReducerState {
  return {
    event,
    accelerator: accelerator.trim().slice(1),
  };
}

/** 가상 키 코드 매핑 테이블 */
const virtualKeyCodes: Record<string, string> = {
  0: 'Digit0',
  1: 'Digit1',
  2: 'Digit2',
  3: 'Digit3',
  4: 'Digit4',
  5: 'Digit5',
  6: 'Digit6',
  7: 'Digit7',
  8: 'Digit8',
  9: 'Digit9',
  '-': 'Minus',
  '=': 'Equal',
  Q: 'KeyQ',
  W: 'KeyW',
  E: 'KeyE',
  R: 'KeyR',
  T: 'KeyT',
  Y: 'KeyY',
  U: 'KeyU',
  I: 'KeyI',
  O: 'KeyO',
  P: 'KeyP',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  A: 'KeyA',
  S: 'KeyS',
  D: 'KeyD',
  F: 'KeyF',
  G: 'KeyG',
  H: 'KeyH',
  J: 'KeyJ',
  K: 'KeyK',
  L: 'KeyL',
  ';': 'Semicolon',
  "'": 'Quote',
  '`': 'Backquote',
  '/': 'Backslash',
  Z: 'KeyZ',
  X: 'KeyX',
  C: 'KeyC',
  V: 'KeyV',
  B: 'KeyB',
  N: 'KeyN',
  M: 'KeyM',
  ',': 'Comma',
  '.': 'Period',
  '\\': 'Slash',
  ' ': 'Space',
};

/**
 * 키를 처리하는 함수
 * @param state - 현재 상태
 * @param key - 키 문자열
 * @returns 업데이트된 상태
 */
function reduceKey(
  { accelerator, event }: ReducerState,
  key: string
): ReducerState {
  if (key.length > 1 || event.key) {
    throw new Error(`Unvalid keycode \`${key}\`.`);
  }

  const code =
    key.toUpperCase() in virtualKeyCodes
      ? virtualKeyCodes[key.toUpperCase()]
      : null;

  return {
    event: Object.assign({}, event, { key }, code ? { code } : null),
    accelerator: accelerator.trim().slice(key.length),
  };
}

/** DOM 키 이름 매핑 테이블 */
const domKeys: Record<string, string> = Object.assign(Object.create(null), {
  plus: 'Add',
  space: 'Space',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  insert: 'Insert',
  return: 'Return',
  enter: 'Return',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  escape: 'Escape',
  esc: 'Escape',
  volumeup: 'AudioVolumeUp',
  volumedown: 'AudioVolumeDown',
  volumemute: 'AudioVolumeMute',
  medianexttrack: 'MediaTrackNext',
  mediaprevioustrack: 'MediaTrackPrevious',
  mediastop: 'MediaStop',
  mediaplaypause: 'MediaPlayPause',
  printscreen: 'PrintScreen',
});

// F1 ~ F24 키를 추가
for (let i = 1; i <= 24; i++) {
  domKeys[`f${i}`] = `F${i}`;
}

/**
 * 코드를 처리하는 함수
 * @param state - 현재 상태
 * @param code - 키 코드 (선택적)
 * @param key - 키 문자열
 * @returns 업데이트된 상태
 */
function reduceCode(
  { accelerator, event }: ReducerState,
  { code, key }: { code?: string; key: string }
): ReducerState {
  if (event.code) {
    throw new Error(`Duplicated keycode \`${key}\`.`);
  }

  return {
    event: Object.assign({}, event, { key }, code ? { code } : null),
    accelerator: accelerator.trim().slice((key && key.length) || 0),
  };
}

/**
 * Electron 가속기 문자열을 DOM KeyboardEvent 객체로 변환하는 함수
 *
 * @param accelerator - Electron 가속기 문자열 (예: `Ctrl+C` 또는 `Shift+Space`)
 * @return 가속기 문자열로부터 파생된 DOM KeyboardEvent 객체
 */
function toKeyEvent(
  accelerator: string
): KeyboardEventState | { unsupportedKeyForPlatform: boolean } {
  let state: ReducerState | UnsupportedType = { accelerator, event: {} };
  while (
    state !== UNSUPPORTED &&
    'accelerator' in state &&
    state.accelerator !== ''
  ) {
    const modifierMatch = state.accelerator.match(modifiers);
    if (modifierMatch) {
      const modifier = modifierMatch[0].toLowerCase();
      const result = reduceModifier(state as ReducerState, modifier);
      if (result === UNSUPPORTED) {
        return { unsupportedKeyForPlatform: true };
      }
      if (result) {
        state = result;
      }
    } else if (state.accelerator.trim()[0] === '+') {
      state = reducePlus(state as ReducerState);
    } else {
      const codeMatch = state.accelerator.match(keyCodes);
      if (codeMatch) {
        const code = codeMatch[0].toLowerCase();
        if (code in domKeys) {
          state = reduceCode(state as ReducerState, {
            code: domKeys[code],
            key: code,
          });
        } else {
          state = reduceKey(state as ReducerState, code);
        }
      } else {
        throw new Error(`Unvalid accelerator: "${state.accelerator}"`);
      }
    }
  }

  return 'event' in state ? state.event : { unsupportedKeyForPlatform: true };
}

export {
  UNSUPPORTED,
  reduceModifier,
  reducePlus,
  reduceKey,
  reduceCode,
  toKeyEvent,
};
