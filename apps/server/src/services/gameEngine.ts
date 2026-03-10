import { v4 as uuidv4 } from 'uuid';
import { normalizeHebrew } from './dictionary';

// All Hebrew letters
const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר',
  'ש', 'ת',
];

// Letters excluded by default (hard to find words for)
const DEFAULT_EXCLUDED_LETTERS = ['ז', 'ט', 'ס', 'ע', 'צ'];

/**
 * Select a random Hebrew letter, excluding hard letters and already-used letters
 */
export function selectLetter(
  usedLetters: string[] = [],
  excludedLetters: string[] = DEFAULT_EXCLUDED_LETTERS
): string {
  const normalizedUsed = usedLetters.map(normalizeHebrew);
  const normalizedExcluded = excludedLetters.map(normalizeHebrew);

  const available = HEBREW_LETTERS.filter((letter) => {
    const normalized = normalizeHebrew(letter);
    return !normalizedUsed.includes(normalized) && !normalizedExcluded.includes(normalized);
  });

  if (available.length === 0) {
    // If all letters have been used, pick from non-excluded letters
    const fallback = HEBREW_LETTERS.filter((letter) => {
      const normalized = normalizeHebrew(letter);
      return !normalizedExcluded.includes(normalized);
    });
    if (fallback.length === 0) {
      // If even those are exhausted, pick from all letters
      return HEBREW_LETTERS[Math.floor(Math.random() * HEBREW_LETTERS.length)];
    }
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Answer info for score calculation
 */
export interface AnswerForScoring {
  userId: string;
  answerText: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHALLENGED';
  category: string;
}

/**
 * Score result per answer
 */
export interface ScoreResult {
  userId: string;
  category: string;
  answerText: string;
  score: number;
  reason: 'unique' | 'shared' | 'invalid' | 'empty';
}

/**
 * Calculate scores for a round's answers.
 *
 * Scoring rules:
 * - Unique valid answer (only one player wrote it): 10 points
 * - Valid answer that at least one other player also wrote: 5 points
 * - Empty, invalid, or rejected: 0 points
 */
export function calculateScores(answers: AnswerForScoring[]): ScoreResult[] {
  const results: ScoreResult[] = [];

  // Group answers by category
  const byCategory = new Map<string, AnswerForScoring[]>();
  for (const answer of answers) {
    const existing = byCategory.get(answer.category) || [];
    existing.push(answer);
    byCategory.set(answer.category, existing);
  }

  for (const [category, categoryAnswers] of byCategory) {
    // Group valid answers by normalized text
    const normalizedGroups = new Map<string, AnswerForScoring[]>();

    for (const answer of categoryAnswers) {
      const isValid =
        answer.status === 'APPROVED' || answer.status === 'CHALLENGED';
      const hasText = answer.answerText && answer.answerText.trim().length > 0;

      if (!isValid || !hasText) {
        results.push({
          userId: answer.userId,
          category,
          answerText: answer.answerText,
          score: 0,
          reason: !hasText ? 'empty' : 'invalid',
        });
        continue;
      }

      const normalized = normalizeHebrew(answer.answerText);
      const group = normalizedGroups.get(normalized) || [];
      group.push(answer);
      normalizedGroups.set(normalized, group);
    }

    // Assign scores based on uniqueness
    for (const [, group] of normalizedGroups) {
      const isUnique = group.length === 1;
      const score = isUnique ? 10 : 5;
      const reason = isUnique ? 'unique' : 'shared';

      for (const answer of group) {
        results.push({
          userId: answer.userId,
          category,
          answerText: answer.answerText,
          score,
          reason,
        });
      }
    }
  }

  return results;
}

/**
 * Generate a random 6-character alphanumeric invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get the list of all playable Hebrew letters (excluding hard ones)
 */
export function getPlayableLetters(
  excludedLetters: string[] = DEFAULT_EXCLUDED_LETTERS
): string[] {
  return HEBREW_LETTERS.filter(
    (letter) => !excludedLetters.includes(letter)
  );
}

/**
 * Get the default categories for a game
 */
export function getDefaultCategories(): string[] {
  return ['country', 'city', 'animal', 'plant', 'name', 'profession'];
}

export default {
  selectLetter,
  calculateScores,
  generateInviteCode,
  getPlayableLetters,
  getDefaultCategories,
};
