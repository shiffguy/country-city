import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { selectLetter, calculateScores, generateInviteCode, getDefaultCategories, AnswerForScoring } from '../services/gameEngine';
import { validateWord, normalizeHebrew } from '../services/dictionary';

// Active game timers and state
interface GameTimer {
  roundTimer?: NodeJS.Timeout;
  stopTimer?: NodeJS.Timeout;
  voteTimer?: NodeJS.Timeout;
  usedLetters: string[];
}

const activeGameTimers = new Map<string, GameTimer>();

// Zod schemas for validation
const createGameSchema = z.object({
  type: z.enum(['PUBLIC', 'PRIVATE']),
  maxPlayers: z.number().int().min(2).max(8).default(4),
  totalRounds: z.number().int().min(1).max(10).default(5),
  categories: z.array(z.string()).min(1).optional(),
});

const joinGameSchema = z.object({
  gameId: z.string().uuid().optional(),
  inviteCode: z.string().length(6).optional(),
}).refine((data) => data.gameId || data.inviteCode, {
  message: 'Either gameId or inviteCode must be provided',
});

const submitAnswersSchema = z.object({
  gameId: z.string().uuid(),
  answers: z.record(z.string(), z.string()), // category -> answerText
});

const voteSchema = z.object({
  answerId: z.string().uuid(),
  vote: z.enum(['APPROVE', 'REJECT']),
});

const ROUND_DURATION_MS = 60000; // 60 seconds
const STOP_COUNTDOWN_MS = 10000; // 10 seconds after someone calls stop
const VOTE_TIMEOUT_MS = 30000; // 30 seconds for voting phase

function getGameTimer(gameId: string): GameTimer {
  let timer = activeGameTimers.get(gameId);
  if (!timer) {
    timer = { usedLetters: [] };
    activeGameTimers.set(gameId, timer);
  }
  return timer;
}

function clearGameTimers(gameId: string): void {
  const timer = activeGameTimers.get(gameId);
  if (timer) {
    if (timer.roundTimer) clearTimeout(timer.roundTimer);
    if (timer.stopTimer) clearTimeout(timer.stopTimer);
    if (timer.voteTimer) clearTimeout(timer.voteTimer);
  }
  activeGameTimers.delete(gameId);
}

async function startRound(io: Server, gameId: string): Promise<void> {
  const gameTimer = getGameTimer(gameId);

  // Select a letter
  const letter = selectLetter(gameTimer.usedLetters);
  gameTimer.usedLetters.push(letter);

  // Update game in DB
  const game = await prisma.game.update({
    where: { id: gameId },
    data: {
      currentRound: { increment: 1 },
      currentLetter: letter,
    },
    include: {
      players: {
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true },
          },
        },
      },
    },
  });

  // Emit round start to all players in the game room
  io.to(`game:${gameId}`).emit('game:roundStart', {
    round: game.currentRound,
    letter,
    categories: game.categories,
    duration: ROUND_DURATION_MS,
  });

  console.log(`[Game ${gameId}] Round ${game.currentRound} started with letter ${letter}`);

  // Set round timer
  gameTimer.roundTimer = setTimeout(async () => {
    await endRound(io, gameId);
  }, ROUND_DURATION_MS);
}

async function endRound(io: Server, gameId: string): Promise<void> {
  const gameTimer = getGameTimer(gameId);

  // Clear any existing timers
  if (gameTimer.roundTimer) {
    clearTimeout(gameTimer.roundTimer);
    gameTimer.roundTimer = undefined;
  }
  if (gameTimer.stopTimer) {
    clearTimeout(gameTimer.stopTimer);
    gameTimer.stopTimer = undefined;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: true,
    },
  });

  if (!game) return;

  // Get all answers for this round
  const roundAnswers = await prisma.answer.findMany({
    where: {
      gameId,
      round: game.currentRound,
    },
    include: {
      user: {
        select: { id: true, nickname: true },
      },
      votes: true,
    },
  });

  // Check if there are any CHALLENGED answers that need voting
  const challengedAnswers = roundAnswers.filter(
    (a: any) => a.status === 'CHALLENGED'
  );

  if (challengedAnswers.length > 0) {
    // Start review/voting phase
    io.to(`game:${gameId}`).emit('game:reviewPhase', {
      gameId,
      round: game.currentRound,
      answers: roundAnswers.map((a: any) => ({
        id: a.id,
        userId: a.userId,
        user: a.user,
        category: a.category,
        answerText: a.answerText,
        status: a.status,
        dictionaryValid: a.dictionaryValid,
        votes: a.votes,
      })),
      duration: VOTE_TIMEOUT_MS,
    });

    // Set vote timeout
    gameTimer.voteTimer = setTimeout(async () => {
      await resolveVotesAndScore(io, gameId);
    }, VOTE_TIMEOUT_MS);
  } else {
    // No challenged answers, go straight to scoring
    await resolveVotesAndScore(io, gameId);
  }
}

async function resolveVotesAndScore(io: Server, gameId: string): Promise<void> {
  const gameTimer = getGameTimer(gameId);
  if (gameTimer.voteTimer) {
    clearTimeout(gameTimer.voteTimer);
    gameTimer.voteTimer = undefined;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true },
  });

  if (!game) return;

  // Get answers with votes for this round
  const roundAnswers = await prisma.answer.findMany({
    where: {
      gameId,
      round: game.currentRound,
    },
    include: {
      votes: true,
      user: {
        select: { id: true, nickname: true },
      },
    },
  });

  // Resolve challenged answers based on votes
  for (const answer of roundAnswers) {
    if (answer.status === 'CHALLENGED') {
      const approveCount = answer.votes.filter(
        (v: any) => v.vote === 'APPROVE'
      ).length;
      const rejectCount = answer.votes.filter(
        (v: any) => v.vote === 'REJECT'
      ).length;

      // Majority decides; tie goes to approval
      const newStatus = approveCount >= rejectCount ? 'APPROVED' : 'REJECTED';

      await prisma.answer.update({
        where: { id: answer.id },
        data: { status: newStatus },
      });

      answer.status = newStatus as any;
    }
  }

  // Calculate scores
  const answersForScoring: AnswerForScoring[] = roundAnswers.map((a: any) => ({
    userId: a.userId,
    answerText: a.answerText,
    status: a.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHALLENGED',
    category: a.category,
  }));

  const scoreResults = calculateScores(answersForScoring);

  // Update answer scores in DB
  for (const result of scoreResults) {
    const matchingAnswer = roundAnswers.find(
      (a: any) =>
        a.userId === result.userId &&
        a.category === result.category
    );
    if (matchingAnswer) {
      await prisma.answer.update({
        where: { id: matchingAnswer.id },
        data: { score: result.score },
      });
    }
  }

  // Aggregate scores by player and update GamePlayer
  const playerScores = new Map<string, number>();
  for (const result of scoreResults) {
    const current = playerScores.get(result.userId) || 0;
    playerScores.set(result.userId, current + result.score);
  }

  for (const [userId, roundScore] of playerScores) {
    await prisma.gamePlayer.updateMany({
      where: {
        gameId,
        userId,
      },
      data: {
        score: { increment: roundScore },
      },
    });
  }

  // Get updated player scores
  const updatedPlayers = await prisma.gamePlayer.findMany({
    where: { gameId },
    include: {
      user: {
        select: { id: true, nickname: true, avatarUrl: true },
      },
    },
    orderBy: { score: 'desc' },
  });

  // Emit round results
  io.to(`game:${gameId}`).emit('game:roundResults', {
    gameId,
    round: game.currentRound,
    scores: scoreResults,
    players: updatedPlayers.map((p: any) => ({
      userId: p.userId,
      user: p.user,
      score: p.score,
      roundScore: playerScores.get(p.userId) || 0,
    })),
  });

  // Check if game is finished
  if (game.currentRound >= game.totalRounds) {
    await finishGame(io, gameId);
  } else {
    // Start next round after a brief delay
    setTimeout(() => {
      startRound(io, gameId);
    }, 5000);
  }
}

async function finishGame(io: Server, gameId: string): Promise<void> {
  clearGameTimers(gameId);

  const game = await prisma.game.update({
    where: { id: gameId },
    data: { status: 'FINISHED' },
    include: {
      players: {
        include: {
          user: {
            select: { id: true, nickname: true, avatarUrl: true, rating: true },
          },
        },
        orderBy: { score: 'desc' },
      },
    },
  });

  // Determine winner
  const winner = game.players[0];

  // Update user stats
  for (const player of game.players) {
    const isWinner = player.userId === winner.userId;

    // Simple ELO-like rating adjustment
    const ratingChange = isWinner ? 25 : -10;

    await prisma.user.update({
      where: { id: player.userId },
      data: {
        gamesPlayed: { increment: 1 },
        wins: isWinner ? { increment: 1 } : undefined,
        rating: { increment: ratingChange },
      },
    });
  }

  io.to(`game:${gameId}`).emit('game:finished', {
    gameId,
    players: game.players.map((p: any) => ({
      userId: p.userId,
      user: p.user,
      score: p.score,
      isWinner: p.userId === winner.userId,
    })),
    winnerId: winner.userId,
  });

  console.log(`[Game ${gameId}] Game finished. Winner: ${winner.user.nickname}`);
}

export function registerGameHandlers(io: Server, socket: Socket): void {
  const userId = (socket.data as { userId: string }).userId;

  /**
   * game:create - Create a new game
   */
  socket.on('game:create', async (data: unknown, callback?: (response: any) => void) => {
    try {
      const parsed = createGameSchema.safeParse(data);
      if (!parsed.success) {
        const errorResponse = { error: 'Invalid input', details: parsed.error.issues };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      const { type, maxPlayers, totalRounds, categories } = parsed.data;
      const gameCategories = categories || getDefaultCategories();

      // Generate invite code for private games
      let inviteCode: string | null = null;
      if (type === 'PRIVATE') {
        inviteCode = generateInviteCode();
        // Ensure uniqueness
        let attempts = 0;
        while (attempts < 10) {
          const existing = await prisma.game.findUnique({
            where: { inviteCode },
          });
          if (!existing) break;
          inviteCode = generateInviteCode();
          attempts++;
        }
      }

      // Create game in DB
      const game = await prisma.game.create({
        data: {
          type,
          maxPlayers,
          totalRounds,
          categories: gameCategories,
          inviteCode,
          createdById: userId,
          players: {
            create: {
              userId,
            },
          },
        },
        include: {
          createdBy: {
            select: { id: true, nickname: true, avatarUrl: true, rating: true },
          },
          players: {
            include: {
              user: {
                select: { id: true, nickname: true, avatarUrl: true, rating: true },
              },
            },
          },
        },
      });

      // Join socket room
      socket.join(`game:${game.id}`);

      const gameState = {
        id: game.id,
        type: game.type,
        status: game.status,
        currentRound: game.currentRound,
        totalRounds: game.totalRounds,
        maxPlayers: game.maxPlayers,
        categories: game.categories,
        inviteCode: game.inviteCode,
        createdBy: game.createdBy,
        players: game.players.map((p: any) => ({
          userId: p.userId,
          user: p.user,
          score: p.score,
        })),
      };

      if (callback) callback({ game: gameState });
      socket.emit('game:state', gameState);

      console.log(`[Game ${game.id}] Created by ${userId} (${game.type})`);
    } catch (err) {
      console.error('[Game] Error creating game:', (err as Error).message);
      const errorResponse = { error: 'Failed to create game' };
      if (callback) callback(errorResponse);
      else socket.emit('game:error', errorResponse);
    }
  });

  /**
   * game:join - Join an existing game
   */
  socket.on('game:join', async (data: unknown, callback?: (response: any) => void) => {
    try {
      const parsed = joinGameSchema.safeParse(data);
      if (!parsed.success) {
        const errorResponse = { error: 'Invalid input', details: parsed.error.issues };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      const { gameId, inviteCode } = parsed.data;

      // Find game
      let game;
      if (gameId) {
        game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, nickname: true, avatarUrl: true, rating: true },
                },
              },
            },
            createdBy: {
              select: { id: true, nickname: true, avatarUrl: true, rating: true },
            },
          },
        });
      } else if (inviteCode) {
        game = await prisma.game.findUnique({
          where: { inviteCode },
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, nickname: true, avatarUrl: true, rating: true },
                },
              },
            },
            createdBy: {
              select: { id: true, nickname: true, avatarUrl: true, rating: true },
            },
          },
        });
      }

      if (!game) {
        const errorResponse = { error: 'Game not found' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      if (game.status !== 'WAITING') {
        const errorResponse = { error: 'Game already started or finished' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      if (game.players.length >= game.maxPlayers) {
        const errorResponse = { error: 'Game is full' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Check if already a player
      const alreadyJoined = game.players.some((p: any) => p.userId === userId);
      if (alreadyJoined) {
        // Rejoin the socket room
        socket.join(`game:${game.id}`);
        const gameState = {
          id: game.id,
          type: game.type,
          status: game.status,
          currentRound: game.currentRound,
          totalRounds: game.totalRounds,
          maxPlayers: game.maxPlayers,
          categories: game.categories,
          inviteCode: game.inviteCode,
          createdBy: game.createdBy,
          players: game.players.map((p: any) => ({
            userId: p.userId,
            user: p.user,
            score: p.score,
          })),
        };
        if (callback) callback({ game: gameState });
        socket.emit('game:state', gameState);
        return;
      }

      // Add player to game
      await prisma.gamePlayer.create({
        data: {
          gameId: game.id,
          userId,
        },
      });

      // Fetch updated game
      const updatedGame = await prisma.game.findUnique({
        where: { id: game.id },
        include: {
          players: {
            include: {
              user: {
                select: { id: true, nickname: true, avatarUrl: true, rating: true },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
          createdBy: {
            select: { id: true, nickname: true, avatarUrl: true, rating: true },
          },
        },
      });

      if (!updatedGame) return;

      // Join socket room
      socket.join(`game:${updatedGame.id}`);

      // Get the new player info
      const newPlayer = updatedGame.players.find((p: any) => p.userId === userId);

      // Notify other players
      socket.to(`game:${updatedGame.id}`).emit('game:playerJoined', {
        player: newPlayer
          ? { userId: newPlayer.userId, user: newPlayer.user, score: newPlayer.score }
          : { userId },
      });

      // Send full state to the joining player
      const gameState = {
        id: updatedGame.id,
        type: updatedGame.type,
        status: updatedGame.status,
        currentRound: updatedGame.currentRound,
        totalRounds: updatedGame.totalRounds,
        maxPlayers: updatedGame.maxPlayers,
        categories: updatedGame.categories,
        inviteCode: updatedGame.inviteCode,
        createdBy: updatedGame.createdBy,
        players: updatedGame.players.map((p: any) => ({
          userId: p.userId,
          user: p.user,
          score: p.score,
        })),
      };

      if (callback) callback({ game: gameState });
      socket.emit('game:state', gameState);

      console.log(`[Game ${updatedGame.id}] Player ${userId} joined`);
    } catch (err) {
      console.error('[Game] Error joining game:', (err as Error).message);
      const errorResponse = { error: 'Failed to join game' };
      if (callback) callback(errorResponse);
      else socket.emit('game:error', errorResponse);
    }
  });

  /**
   * game:leave - Leave a game
   */
  socket.on('game:leave', async (data: { gameId: string }, callback?: (response: any) => void) => {
    try {
      const { gameId } = data;
      if (!gameId) {
        const errorResponse = { error: 'gameId is required' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      if (!game) {
        const errorResponse = { error: 'Game not found' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Remove the player
      await prisma.gamePlayer.deleteMany({
        where: { gameId, userId },
      });

      // Leave socket room
      socket.leave(`game:${gameId}`);

      // Notify others
      io.to(`game:${gameId}`).emit('game:playerLeft', { userId });

      // If the host (creator) left
      if (game.createdById === userId) {
        const remainingPlayers = game.players.filter(
          (p: any) => p.userId !== userId
        );

        if (remainingPlayers.length === 0) {
          // No players left, delete the game
          clearGameTimers(gameId);
          await prisma.game.delete({ where: { id: gameId } });
          console.log(`[Game ${gameId}] Deleted (no players remaining)`);
        } else {
          // Assign new host
          const newHost = remainingPlayers[0];
          await prisma.game.update({
            where: { id: gameId },
            data: { createdById: newHost.userId },
          });
          io.to(`game:${gameId}`).emit('game:hostChanged', {
            newHostId: newHost.userId,
          });
          console.log(`[Game ${gameId}] Host changed to ${newHost.userId}`);
        }
      }

      if (callback) callback({ success: true });
      console.log(`[Game ${gameId}] Player ${userId} left`);
    } catch (err) {
      console.error('[Game] Error leaving game:', (err as Error).message);
      const errorResponse = { error: 'Failed to leave game' };
      if (callback) callback(errorResponse);
      else socket.emit('game:error', errorResponse);
    }
  });

  /**
   * game:start - Start the game (only host can do this)
   */
  socket.on('game:start', async (data: { gameId: string }, callback?: (response: any) => void) => {
    try {
      const { gameId } = data;
      if (!gameId) {
        const errorResponse = { error: 'gameId is required' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      if (!game) {
        const errorResponse = { error: 'Game not found' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Only host can start
      if (game.createdById !== userId) {
        const errorResponse = { error: 'Only the host can start the game' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      if (game.status !== 'WAITING') {
        const errorResponse = { error: 'Game already started or finished' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      if (game.players.length < 2) {
        const errorResponse = { error: 'Need at least 2 players to start' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Update game status
      await prisma.game.update({
        where: { id: gameId },
        data: { status: 'ACTIVE' },
      });

      io.to(`game:${gameId}`).emit('game:started', { gameId });

      if (callback) callback({ success: true });

      // Start the first round
      await startRound(io, gameId);

      console.log(`[Game ${gameId}] Game started with ${game.players.length} players`);
    } catch (err) {
      console.error('[Game] Error starting game:', (err as Error).message);
      const errorResponse = { error: 'Failed to start game' };
      if (callback) callback(errorResponse);
      else socket.emit('game:error', errorResponse);
    }
  });

  /**
   * game:submitAnswers - Submit answers for the current round
   */
  socket.on('game:submitAnswers', async (data: unknown, callback?: (response: any) => void) => {
    try {
      const parsed = submitAnswersSchema.safeParse(data);
      if (!parsed.success) {
        const errorResponse = { error: 'Invalid input', details: parsed.error.issues };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      const { gameId, answers } = parsed.data;

      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });

      if (!game || game.status !== 'ACTIVE') {
        const errorResponse = { error: 'Game not found or not active' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      if (!game.currentLetter) {
        const errorResponse = { error: 'No active round' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Delete any existing answers for this user/round (in case of resubmission)
      await prisma.answer.deleteMany({
        where: {
          gameId,
          round: game.currentRound,
          userId,
        },
      });

      // Validate and create answers
      const createdAnswers = [];
      for (const category of game.categories) {
        const answerText = answers[category] || '';
        let status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHALLENGED' = 'PENDING';
        let dictionaryValid = false;

        if (answerText.trim()) {
          const validation = validateWord(
            answerText,
            category,
            game.currentLetter
          );
          status = validation.status;
          dictionaryValid = validation.valid;
        } else {
          status = 'REJECTED';
        }

        const answer = await prisma.answer.create({
          data: {
            gameId,
            round: game.currentRound,
            userId,
            category,
            answerText: answerText.trim(),
            status,
            dictionaryValid,
          },
        });

        createdAnswers.push({
          id: answer.id,
          category: answer.category,
          answerText: answer.answerText,
          status: answer.status,
          dictionaryValid: answer.dictionaryValid,
        });
      }

      // Notify the room that this player has submitted
      io.to(`game:${gameId}`).emit('game:playerSubmitted', {
        userId,
        gameId,
      });

      if (callback) callback({ success: true, answers: createdAnswers });

      // Check if all players have submitted
      const totalPlayers = await prisma.gamePlayer.count({
        where: { gameId },
      });

      const submittedPlayers = await prisma.answer.groupBy({
        by: ['userId'],
        where: {
          gameId,
          round: game.currentRound,
        },
      });

      if (submittedPlayers.length >= totalPlayers) {
        // All players submitted, end round early
        console.log(`[Game ${gameId}] All players submitted, ending round`);
        await endRound(io, gameId);
      }
    } catch (err) {
      console.error('[Game] Error submitting answers:', (err as Error).message);
      const errorResponse = { error: 'Failed to submit answers' };
      if (callback) callback(errorResponse);
      else socket.emit('game:error', errorResponse);
    }
  });

  /**
   * game:callStop - A player calls stop (triggers countdown)
   */
  socket.on('game:callStop', async (data: { gameId: string }, callback?: (response: any) => void) => {
    try {
      const { gameId } = data;
      if (!gameId) {
        const errorResponse = { error: 'gameId is required' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      const gameTimer = getGameTimer(gameId);

      // Don't allow double-stop
      if (gameTimer.stopTimer) {
        const errorResponse = { error: 'Stop already called' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Clear the main round timer
      if (gameTimer.roundTimer) {
        clearTimeout(gameTimer.roundTimer);
        gameTimer.roundTimer = undefined;
      }

      // Emit stop called with countdown
      io.to(`game:${gameId}`).emit('game:stopCalled', {
        calledBy: userId,
        countdown: STOP_COUNTDOWN_MS,
      });

      if (callback) callback({ success: true });

      // Set stop countdown timer
      gameTimer.stopTimer = setTimeout(async () => {
        gameTimer.stopTimer = undefined;
        await endRound(io, gameId);
      }, STOP_COUNTDOWN_MS);

      console.log(`[Game ${gameId}] Stop called by ${userId}`);
    } catch (err) {
      console.error('[Game] Error calling stop:', (err as Error).message);
      const errorResponse = { error: 'Failed to call stop' };
      if (callback) callback(errorResponse);
      else socket.emit('game:error', errorResponse);
    }
  });

  /**
   * game:vote - Vote on a challenged answer
   */
  socket.on('game:vote', async (data: unknown, callback?: (response: any) => void) => {
    try {
      const parsed = voteSchema.safeParse(data);
      if (!parsed.success) {
        const errorResponse = { error: 'Invalid input', details: parsed.error.issues };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      const { answerId, vote } = parsed.data;

      // Find the answer
      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
        include: { game: { include: { players: true } } },
      });

      if (!answer) {
        const errorResponse = { error: 'Answer not found' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      if (answer.status !== 'CHALLENGED') {
        const errorResponse = { error: 'Answer is not in CHALLENGED status' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Cannot vote on own answer
      if (answer.userId === userId) {
        const errorResponse = { error: 'Cannot vote on your own answer' };
        if (callback) callback(errorResponse);
        else socket.emit('game:error', errorResponse);
        return;
      }

      // Upsert the vote
      await prisma.vote.upsert({
        where: {
          answerId_voterUserId: {
            answerId,
            voterUserId: userId,
          },
        },
        create: {
          answerId,
          voterUserId: userId,
          vote,
        },
        update: {
          vote,
        },
      });

      // Get updated vote counts
      const votes = await prisma.vote.findMany({
        where: { answerId },
      });

      const approveCount = votes.filter((v: any) => v.vote === 'APPROVE').length;
      const rejectCount = votes.filter((v: any) => v.vote === 'REJECT').length;

      // Emit vote update to the game room
      io.to(`game:${answer.gameId}`).emit('game:voteUpdate', {
        answerId,
        approveCount,
        rejectCount,
        totalVotes: votes.length,
      });

      if (callback) callback({ success: true });

      // Check if all eligible voters have voted
      const eligibleVoters = answer.game.players.filter(
        (p: any) => p.userId !== answer.userId
      );
      if (votes.length >= eligibleVoters.length) {
        // All votes are in for this answer, check if all challenged answers are resolved
        const allChallenged = await prisma.answer.findMany({
          where: {
            gameId: answer.gameId,
            round: answer.round,
            status: 'CHALLENGED',
          },
          include: {
            votes: true,
            game: { include: { players: true } },
          },
        });

        const allResolved = allChallenged.every((a: any) => {
          const voterCount = a.game.players.filter(
            (p: any) => p.userId !== a.userId
          ).length;
          return a.votes.length >= voterCount;
        });

        if (allResolved) {
          // All challenged answers have been voted on, resolve and score
          await resolveVotesAndScore(io, answer.gameId);
        }
      }
    } catch (err) {
      console.error('[Game] Error voting:', (err as Error).message);
      const errorResponse = { error: 'Failed to vote' };
      if (callback) callback(errorResponse);
      else socket.emit('game:error', errorResponse);
    }
  });

  /**
   * Handle disconnection - clean up game state
   */
  socket.on('disconnecting', async () => {
    try {
      // Find games this user is in
      const gamePlayers = await prisma.gamePlayer.findMany({
        where: { userId },
        include: {
          game: {
            include: { players: true },
          },
        },
      });

      for (const gp of gamePlayers) {
        if (gp.game.status === 'WAITING') {
          // Leave waiting games
          await prisma.gamePlayer.deleteMany({
            where: { gameId: gp.gameId, userId },
          });
          io.to(`game:${gp.gameId}`).emit('game:playerLeft', { userId });

          // Handle host leaving
          if (gp.game.createdById === userId) {
            const remaining = gp.game.players.filter(
              (p: any) => p.userId !== userId
            );
            if (remaining.length === 0) {
              clearGameTimers(gp.gameId);
              await prisma.game.delete({ where: { id: gp.gameId } });
            } else {
              await prisma.game.update({
                where: { id: gp.gameId },
                data: { createdById: remaining[0].userId },
              });
              io.to(`game:${gp.gameId}`).emit('game:hostChanged', {
                newHostId: remaining[0].userId,
              });
            }
          }
        }
        // Active games: player stays but is marked as disconnected
        // They can reconnect
      }
    } catch (err) {
      console.error('[Game] Error handling disconnect:', (err as Error).message);
    }
  });
}

export { startRound, clearGameTimers };
