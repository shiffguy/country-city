import { FINAL_LETTER_MAP } from './letters';

/**
 * Strips Hebrew niqqud (vowel diacritics) and cantillation marks from text,
 * and normalizes final (sofit) letters to their regular forms.
 */
export function normalizeHebrew(text: string): string {
  // Strip niqqud and cantillation marks (Unicode range U+0591 to U+05C7)
  let normalized = text.replace(/[\u0591-\u05C7]/g, '');

  // Normalize final letters to regular forms
  for (const [finalLetter, regularLetter] of Object.entries(FINAL_LETTER_MAP)) {
    normalized = normalized.split(finalLetter).join(regularLetter);
  }

  return normalized.trim();
}

/**
 * Checks if the normalized text starts with the given Hebrew letter.
 */
export function startsWithLetter(text: string, letter: string): boolean {
  const normalized = normalizeHebrew(text);
  const normalizedLetter = normalizeHebrew(letter);

  if (normalized.length === 0 || normalizedLetter.length === 0) {
    return false;
  }

  return normalized.charAt(0) === normalizedLetter.charAt(0);
}

/**
 * Checks if the text is a valid answer:
 * - Non-empty after trimming
 * - Contains at least one Hebrew character (U+0590 to U+05FF range, excluding niqqud)
 */
export function isValidAnswer(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return false;
  }

  // Check for at least one Hebrew letter (U+05D0 to U+05EA)
  return /[\u05D0-\u05EA]/.test(trimmed);
}

/**
 * Sanitizes user input by trimming and removing excess whitespace.
 */
export function sanitizeInput(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}
