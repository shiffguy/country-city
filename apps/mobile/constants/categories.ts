export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'country', label: '\u05d0\u05e8\u05e5', emoji: '\ud83c\udf0d' },
  { id: 'city', label: '\u05e2\u05d9\u05e8', emoji: '\ud83c\udfd9\ufe0f' },
  { id: 'animal', label: '\u05d7\u05d9', emoji: '\ud83d\udc3e' },
  { id: 'plant', label: '\u05e6\u05d5\u05de\u05d7', emoji: '\ud83c\udf3f' },
  { id: 'name', label: '\u05e9\u05dd', emoji: '\ud83d\udc64' },
  { id: 'profession', label: '\u05de\u05e7\u05e6\u05d5\u05e2', emoji: '\ud83d\udcbc' },
];

export const ALL_CATEGORIES: Category[] = [
  ...DEFAULT_CATEGORIES,
  { id: 'food', label: '\u05d0\u05d5\u05db\u05dc', emoji: '\ud83c\udf7d\ufe0f' },
  { id: 'object', label: '\u05d3\u05d5\u05de\u05dd', emoji: '\ud83d\udce6' },
  { id: 'celebrity', label: '\u05de\u05e4\u05d5\u05e8\u05e1\u05dd', emoji: '\u2b50' },
  { id: 'movie', label: '\u05e1\u05e8\u05d8', emoji: '\ud83c\udfac' },
];

export const HEBREW_LETTERS = [
  '\u05d0', '\u05d1', '\u05d2', '\u05d3', '\u05d4', '\u05d5', '\u05d6',
  '\u05d7', '\u05d8', '\u05d9', '\u05db', '\u05dc', '\u05de', '\u05e0',
  '\u05e1', '\u05e2', '\u05e4', '\u05e6', '\u05e7', '\u05e8', '\u05e9',
  '\u05ea',
];
