export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'country', label: 'ארץ', emoji: '🌍' },
  { id: 'city', label: 'עיר', emoji: '🏙️' },
  { id: 'animal', label: 'חי', emoji: '🐾' },
  { id: 'plant', label: 'צומח', emoji: '🌿' },
  { id: 'name', label: 'שם', emoji: '👤' },
  { id: 'profession', label: 'מקצוע', emoji: '💼' },
];

export const ALL_CATEGORIES: Category[] = [
  ...DEFAULT_CATEGORIES,
  { id: 'food', label: 'אוכל', emoji: '🍽️' },
  { id: 'object', label: 'דומם', emoji: '📦' },
  { id: 'celebrity', label: 'מפורסם', emoji: '⭐' },
  { id: 'movie', label: 'סרט', emoji: '🎬' },
];
