import * as fs from 'fs';
import * as path from 'path';

// Category name to filename mapping
const CATEGORY_FILE_MAP: Record<string, string> = {
  country: 'countries.json',
  city: 'cities.json',
  animal: 'animals.json',
  plant: 'plants.json',
  name: 'names.json',
  profession: 'professions.json',
};

// Storage for dictionary data
const categoryDictionaries = new Map<string, Set<string>>();
const generalDictionary = new Set<string>();

// All words across all categories for general lookup
const allCategoryWords = new Set<string>();

/**
 * Strip Hebrew niqqud (vowel marks) from text
 * Unicode range 0x0591-0x05C7 covers all Hebrew accents and points
 */
function stripNiqqud(text: string): string {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

/**
 * Normalize Hebrew final letters to their regular forms
 * ם→מ, ן→נ, ף→פ, ץ→צ, ך→כ
 */
function normalizeFinalLetters(text: string): string {
  return text
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/ך/g, 'כ');
}

/**
 * Full Hebrew text normalization:
 * 1. Strip niqqud
 * 2. Normalize final letters
 * 3. Trim whitespace
 * 4. Convert to lowercase (for any non-Hebrew chars)
 */
export function normalizeHebrew(text: string): string {
  let normalized = stripNiqqud(text);
  normalized = normalizeFinalLetters(normalized);
  normalized = normalized.trim().toLowerCase();
  return normalized;
}

/**
 * Load a JSON file containing an array of words
 */
function loadJsonFile(filePath: string): string[] {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[Dictionary] File not found: ${filePath}`);
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[Dictionary] File does not contain an array: ${filePath}`);
      return [];
    }
    return parsed as string[];
  } catch (err) {
    console.error(`[Dictionary] Error loading ${filePath}:`, (err as Error).message);
    return [];
  }
}

/**
 * Load all dictionary files on startup
 */
export function loadDictionaries(): void {
  const dictionaryDir = path.join(__dirname, '..', 'data', 'dictionary');

  console.log(`[Dictionary] Loading dictionaries from ${dictionaryDir}`);

  // Load category-specific dictionaries
  for (const [category, filename] of Object.entries(CATEGORY_FILE_MAP)) {
    const filePath = path.join(dictionaryDir, filename);
    const words = loadJsonFile(filePath);
    const normalizedWords = new Set(words.map(normalizeHebrew));
    categoryDictionaries.set(category, normalizedWords);

    // Add to allCategoryWords
    for (const word of normalizedWords) {
      allCategoryWords.add(word);
    }

    console.log(`[Dictionary] Loaded ${normalizedWords.size} words for category "${category}"`);
  }

  // Load general dictionary
  const generalPath = path.join(dictionaryDir, 'general.json');
  const generalWords = loadJsonFile(generalPath);
  for (const word of generalWords) {
    generalDictionary.add(normalizeHebrew(word));
  }
  console.log(`[Dictionary] Loaded ${generalDictionary.size} words in general dictionary`);

  const totalCategories = categoryDictionaries.size;
  console.log(`[Dictionary] Loaded ${totalCategories} category dictionaries, ${allCategoryWords.size} total category words, ${generalDictionary.size} general words`);
}

export interface ValidationResult {
  valid: boolean;
  status: 'APPROVED' | 'CHALLENGED' | 'REJECTED';
}

/**
 * Validate a word against the dictionary for a given category and letter
 *
 * Rules:
 * - Word must start with the given letter (after normalization)
 * - If found in the specific category dictionary → APPROVED
 * - If found in general dictionary but NOT in category → CHALLENGED
 * - If not found anywhere → REJECTED
 */
export function validateWord(
  word: string,
  category: string,
  letter: string
): ValidationResult {
  if (!word || !word.trim()) {
    return { valid: false, status: 'REJECTED' };
  }

  const normalizedWord = normalizeHebrew(word);
  const normalizedLetter = normalizeHebrew(letter);

  // Check word starts with the correct letter
  if (!normalizedWord.startsWith(normalizedLetter)) {
    return { valid: false, status: 'REJECTED' };
  }

  // Check in specific category dictionary
  const categoryDict = categoryDictionaries.get(category);
  if (categoryDict && categoryDict.has(normalizedWord)) {
    return { valid: true, status: 'APPROVED' };
  }

  // Check in general dictionary
  if (generalDictionary.has(normalizedWord)) {
    return { valid: true, status: 'CHALLENGED' };
  }

  // Check in any other category dictionary (cross-category match is still challenged)
  if (allCategoryWords.has(normalizedWord)) {
    return { valid: true, status: 'CHALLENGED' };
  }

  return { valid: false, status: 'REJECTED' };
}

/**
 * Get the list of categories available
 */
export function getAvailableCategories(): string[] {
  return Object.keys(CATEGORY_FILE_MAP);
}

/**
 * Check if a category exists
 */
export function isValidCategory(category: string): boolean {
  return CATEGORY_FILE_MAP.hasOwnProperty(category);
}

export default {
  loadDictionaries,
  normalizeHebrew,
  validateWord,
  getAvailableCategories,
  isValidCategory,
};
