import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * GET /users/:id/stats
 * Get user statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        rating: true,
        gamesPlayed: true,
        wins: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate additional stats
    const recentGames = await prisma.gamePlayer.findMany({
      where: { userId: id },
      include: {
        game: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 10,
    });

    const winRate =
      user.gamesPlayed > 0
        ? Math.round((user.wins / user.gamesPlayed) * 100)
        : 0;

    res.json({
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        wins: user.wins,
        winRate,
        createdAt: user.createdAt,
      },
      recentGames: recentGames.map((gp: any) => ({
        gameId: gp.game.id,
        status: gp.game.status,
        score: gp.score,
        playedAt: gp.game.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Users] Error getting stats:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
