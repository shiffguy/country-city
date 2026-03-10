export const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
] as const;

// Letters that are hard to play with - too few words start with them
export const EXCLUDED_LETTERS = ['ז', 'ט', 'ס', 'ע', 'צ'] as const;

export const PLAYABLE_LETTERS = HEBREW_LETTERS.filter(
  l => !(EXCLUDED_LETTERS as readonly string[]).includes(l)
);

// Final letter to regular letter mapping
export const FINAL_LETTER_MAP: Record<string, string> = {
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ',
  'ך': 'כ',
};
