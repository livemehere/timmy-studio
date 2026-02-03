// for macos
export function isIncludeSubStr(str: string, subStr: string) {
  return str
    .toLowerCase()
    .normalize('NFC')
    .includes(subStr.toLowerCase().normalize('NFC'));
}
