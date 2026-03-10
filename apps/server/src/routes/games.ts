import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All game routes require authentication
router.use(authenticateToken);

/**
 * GET /games/:id
 * Get current game state including players and current round answers
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            rating: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
                rating: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        // Answers are fetched separately by current round below
      },
    });

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check if user is a player in this game
    const isPlayer = game.players.some((p: any) => p.userId === userId);
    if (!isPlayer && game.type === 'PRIVATE') {
      res.status(403).json({ error: 'Not authorized to view this game' });
      return;
    }

    // Get current round answers
    const currentRoundAnswers = await prisma.answer.findMany({
      where: {
        gameId: id,
        round: game.currentRound,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
        votes: true,
      },
    });

    res.json({
      game: {
        id: game.id,
        type: game.type,
        status: game.status,
        currentLetter: game.currentLetter,
        currentRound: game.currentRound,
        totalRounds: game.totalRounds,
        maxPlayers: game.maxPlayers,
        categories: game.categories,
        inviteCode: game.inviteCode,
        createdBy: game.createdBy,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      },
      players: game.players.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        score: p.score,
        joinedAt: p.joinedAt,
      })),
      currentRoundAnswers: currentRoundAnswers.map((a: any) => ({
        id: a.id,
        userId: a.userId,
        user: a.user,
        category: a.category,
        answerText: a.answerText,
        status: a.status,
        score: a.score,
        votes: a.votes,
      })),
    });
  } catch (err) {
    console.error('[Games] Error getting game:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /games/:id/results
 * Get complete game results with all rounds
 */
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
                rating: true,
              },
            },
          },
          orderBy: { score: 'desc' },
        },
        answers: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
            votes: {
              include: {
                voter: {
                  select: {
                    id: true,
                    nickname: true,
                  },
                },
              },
            },
          },
          orderBy: [{ round: 'asc' }, { category: 'asc' }],
        },
      },
    });

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Group answers by round
    const roundsMap = new Map<number, typeof game.answers>();
    for (const answer of game.answers) {
      const roundAnswers = roundsMap.get(answer.round) || [];
      roundAnswers.push(answer);
      roundsMap.set(answer.round, roundAnswers);
    }

    const rounds = Array.from(roundsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, answers]) => ({
        round,
        answers: answers.map((a: any) => ({
          id: a.id,
          userId: a.userId,
          user: a.user,
          category: a.category,
          answerText: a.answerText,
          status: a.status,
          dictionaryValid: a.dictionaryValid,
          score: a.score,
          votes: a.votes.map((v: any) => ({
            id: v.id,
            voter: v.voter,
            vote: v.vote,
          })),
        })),
      }));

    res.json({
      game: {
        id: game.id,
        type: game.type,
        status: game.status,
        totalRounds: game.totalRounds,
        categories: game.categories,
        createdAt: game.createdAt,
      },
      players: game.players.map((p: any) => ({
        userId: p.userId,
        user: p.user,
        score: p.score,
      })),
      rounds,
    });
  } catch (err) {
    console.error('[Games] Error getting results:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
