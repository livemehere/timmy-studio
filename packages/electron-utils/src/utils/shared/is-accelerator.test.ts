import { describe, expect, test } from 'vitest';
import validateAccelerator from './is-accelerator';

describe('is-accelerator', () => {
  test('validateAccelerator() 성공 케이스', () => {
    expect(validateAccelerator('Ctrl+Shift+K')).toBe(true);
    expect(validateAccelerator('CmdOrCtrl+Option+F5')).toBe(true);
    expect(validateAccelerator('Alt+X')).toBe(true);
    expect(validateAccelerator('Super+Enter')).toBe(true);
  });

  test('validateAccelerator() 단일 키 (모디파이어 없음)', () => {
    expect(validateAccelerator('K')).toBe(true);
    expect(validateAccelerator('F1')).toBe(true);
    expect(validateAccelerator('F12')).toBe(true);
    expect(validateAccelerator('0')).toBe(true);
    expect(validateAccelerator('9')).toBe(true);
  });

  test('validateAccelerator() 특수 키들', () => {
    expect(validateAccelerator('Ctrl+Space')).toBe(true);
    expect(validateAccelerator('Alt+Tab')).toBe(true);
    expect(validateAccelerator('Ctrl+Backspace')).toBe(true);
    expect(validateAccelerator('Shift+Delete')).toBe(true);
    expect(validateAccelerator('Ctrl+Insert')).toBe(true);
    expect(validateAccelerator('Escape')).toBe(true);
    expect(validateAccelerator('Esc')).toBe(true);
    expect(validateAccelerator('Plus')).toBe(true);
  });

  test('validateAccelerator() 화살표 및 내비게이션 키', () => {
    expect(validateAccelerator('Ctrl+Up')).toBe(true);
    expect(validateAccelerator('Alt+Down')).toBe(true);
    expect(validateAccelerator('Shift+Left')).toBe(true);
    expect(validateAccelerator('Ctrl+Right')).toBe(true);
    expect(validateAccelerator('Ctrl+Home')).toBe(true);
    expect(validateAccelerator('Ctrl+End')).toBe(true);
    expect(validateAccelerator('Ctrl+PageUp')).toBe(true);
    expect(validateAccelerator('Ctrl+PageDown')).toBe(true);
  });

  test('validateAccelerator() 미디어 키들', () => {
    expect(validateAccelerator('MediaNextTrack')).toBe(true);
    expect(validateAccelerator('MediaPreviousTrack')).toBe(true);
    expect(validateAccelerator('MediaStop')).toBe(true);
    expect(validateAccelerator('MediaPlayPause')).toBe(true);
    expect(validateAccelerator('VolumeUp')).toBe(true);
    expect(validateAccelerator('VolumeDown')).toBe(true);
    expect(validateAccelerator('VolumeMute')).toBe(true);
    expect(validateAccelerator('PrintScreen')).toBe(true);
  });

  test('validateAccelerator() 숫자 및 특수문자 키', () => {
    expect(validateAccelerator('Ctrl+0')).toBe(true);
    expect(validateAccelerator('Ctrl+9')).toBe(true);
    expect(validateAccelerator('Ctrl+Plus')).toBe(true);
    expect(validateAccelerator('Shift+!')).toBe(true);
    expect(validateAccelerator('Alt+@')).toBe(true);
    expect(validateAccelerator('Ctrl+#')).toBe(true);
  });

  test('validateAccelerator() 펑션 키들', () => {
    expect(validateAccelerator('F1')).toBe(true);
    expect(validateAccelerator('F10')).toBe(true);
    expect(validateAccelerator('F12')).toBe(true);
    expect(validateAccelerator('F24')).toBe(true);
    expect(validateAccelerator('Ctrl+F1')).toBe(true);
    expect(validateAccelerator('Alt+F12')).toBe(true);
  });

  test('validateAccelerator() 다양한 모디파이어 조합', () => {
    expect(validateAccelerator('Command+K')).toBe(true);
    expect(validateAccelerator('Cmd+K')).toBe(true);
    expect(validateAccelerator('Control+K')).toBe(true);
    expect(validateAccelerator('CommandOrControl+K')).toBe(true);
    expect(validateAccelerator('Option+K')).toBe(true);
    expect(validateAccelerator('AltGr+K')).toBe(true);
    expect(validateAccelerator('Ctrl+Alt+Shift+K')).toBe(true);
    expect(validateAccelerator('Cmd+Shift+Alt+F5')).toBe(true);
  });

  test('validateAccelerator() 실패 케이스', () => {
    expect(validateAccelerator('Ctrl+Shift+')).toBe(false); // 키 없음
    expect(validateAccelerator('Ctrl+Shift+InvalidKey')).toBe(false); // 잘못된 키
    expect(validateAccelerator('InvalidModifier+K')).toBe(false); // 잘못된 수식어
    expect(validateAccelerator('Ctrl+Shift+K+L')).toBe(false); // 키가 2개 이상
  });

  test('validateAccelerator() 추가 실패 케이스', () => {
    expect(validateAccelerator('')).toBe(false); // 빈 문자열
    expect(validateAccelerator('+')).toBe(false); // + 만
    expect(validateAccelerator('Ctrl+')).toBe(false); // 모디파이어만
    expect(validateAccelerator('Ctrl++')).toBe(false); // 빈 키
    expect(validateAccelerator('ctrl+k')).toBe(false); // 소문자 모디파이어 (대소문자 구분)
    expect(validateAccelerator('Ctrl+k')).toBe(false); // 소문자 키 (대소문자 구분)
    expect(validateAccelerator('Ctrl+F25')).toBe(false); // 유효하지 않은 펑션 키
    expect(validateAccelerator('Ctrl+F0')).toBe(false); // 유효하지 않은 펑션 키
  });
});
