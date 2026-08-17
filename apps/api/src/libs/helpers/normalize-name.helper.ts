// The closing NFC matters: lower-casing some characters (U+0130) yields a decomposed sequence
const normalizeName = (name: string): string =>
  name
    .normalize('NFC')
    .replace(/\p{Zs}+/gu, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFC');

export { normalizeName };
