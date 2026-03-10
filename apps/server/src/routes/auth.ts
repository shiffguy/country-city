import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { generateToken } from '../middleware/auth';

const router = Router();

const guestSchema = z.object({
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(20, 'Nickname must be at most 20 characters')
    .trim(),
});

/**
 * POST /auth/guest
 * Create a guest user and return a JWT token
 */
router.post('/guest', async (req: Request, res: Response) => {
  try {
    const parsed = guestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.issues,
      });
      return;
    }

    const { nickname } = parsed.data;

    const user = await prisma.user.create({
      data: {
        nickname,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error('[Auth] Error creating guest user:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
