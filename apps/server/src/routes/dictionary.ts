import { Router, Request, Response } from 'express';
import { validateWord } from '../services/dictionary';

const router = Router();

/**
 * GET /dictionary/validate
 * Validate a word against the dictionary
 * Query params: word, category, letter (optional)
 */
router.get('/validate', (req: Request, res: Response) => {
  try {
    const { word, category, letter } = req.query;

    if (!word || typeof word !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "word" query parameter' });
      return;
    }

    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "category" query parameter' });
      return;
    }

    // If letter is not provided, use the first character of the word
    const letterToCheck =
      letter && typeof letter === 'string' ? letter : word.charAt(0);

    const result = validateWord(word, category, letterToCheck);

    res.json({
      word,
      category,
      letter: letterToCheck,
      valid: result.valid,
      status: result.status,
    });
  } catch (err) {
    console.error('[Dictionary] Error validating word:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
