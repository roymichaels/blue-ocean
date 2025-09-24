const HEBREW_NIQQUD_PATTERN = /[\u0591-\u05C7]/g;

export function normalizeHebrew(input: string): string {
  return input.normalize('NFKD').replace(HEBREW_NIQQUD_PATTERN, '');
}
