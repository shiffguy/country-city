import { Server } from 'socket.io';
import { authenticateSocket } from '../middleware/auth';
import { registerGameHandlers } from './gameHandlers';
import { registerChatHandlers } from './chatHandlers';
import {
  joinQueue,
  leaveQueue,
  setMatchCallback,
  startMatchmaking,
  MatchResult,
} from '../services/matchmaking';
import prisma from '../lib/prisma';
import { getDefaultCategories } from '../services/gameEngine';
import { startRound } from './gameHandlers';

export function initializeSocketHandlers(io: Server): void {
  // Authenticate all socket connections
  io.use(authenticateSocket);

  // Set up matchmaking callback
  setMatchCallback(async (match: MatchResult) => {
    try {
      await handleMatchFound(io, match);
    } catch (err) {
      console.error('[Matchmaking] Error handling match:', (err as Error).message);
    }
  });

  // Start matchmaking loop
  startMatchmaking();

  io.on('connection', async (socket) => {
    const userId = (socket.data as { userId: string }).userId;
    console.log(`[Socket] User ${userId} connected (socket: ${socket.id})`);

    // Join user to their personal room for direct messages
    socket.join(`user:${userId}`);

    // Update last seen
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() },
      });
    } catch (err) {
      // User might not exist yet, that's ok
    }

    // Register game event handlers
    registerGameHandlers(io, socket);

    // Register chat event handlers
    registerChatHandlers(io, socket);

    // Register matchmaking event handlers
    registerMatchmakingHandlers(io, socket, userId);

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket] User ${userId} disconnected (socket: ${socket.id})`);

      // Leave matchmaking queue
      try {
        await leaveQueue(userId);
      } catch (err) {
        console.error('[Socket] Error leaving queue on disconnect:', (err as Error).message);
      }
    });
  });

  console.log('[Socket] Socket handlers initialized');
}

function registerMatchmakingHandlers(
  io: Server,
  socket: import('socket.io').Socket,
  userId: string
): void {
  /**
   * matchmaking:join - Join the matchmaking queue
   */
  socket.on('matchmaking:join', async (data?: { rating?: number }, callback?: (response: any) => void) => {
    try {
      // Get user's rating from DB
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rating: true },
      });

      const rating = user?.rating || 1000;

      await joinQueue(userId, socket.id, rating);

      socket.emit('matchmaking:joined', { position: 0 }); // Position is approximate
      if (callback) callback({ success: true });

      console.log(`[Matchmaking] User ${userId} joined queue`);
    } catch (err) {
      console.error('[Matchmaking] Error joining queue:', (err as Error).message);
      const errorResponse = { error: 'Failed to join matchmaking queue' };
      if (callback) callback(errorResponse);
      else socket.emit('matchmaking:error', errorResponse);
    }
  });

  /**
   * matchmaking:leave - Leave the matchmaking queue
   */
  socket.on('matchmaking:leave', async (data?: unknown, callback?: (response: any) => void) => {
    try {
      await leaveQueue(userId);
      socket.emit('matchmaking:left', {});
      if (callback) callback({ success: true });

      console.log(`[Matchmaking] User ${userId} left queue`);
    } catch (err) {
      console.error('[Matchmaking] Error leaving queue:', (err as Error).message);
      const errorResponse = { error: 'Failed to leave matchmaking queue' };
      if (callback) callback(errorResponse);
      else socket.emit('matchmaking:error', errorResponse);
    }
  });
}

/**
 * Handle when the matchmaking service finds a match
 */
async function handleMatchFound(io: Server, match: MatchResult): Promise<void> {
  const { players } = match;

  console.log(`[Matchmaking] Match found with ${players.length} players`);

  // Create a public game for the matched players
  const hostPlayer = players[0];

  const game = await prisma.game.create({
    data: {
      type: 'PUBLIC',
      maxPlayers: players.length,
      totalRounds: 5,
      categories: getDefaultCategories(),
      createdById: hostPlayer.userId,
      status: 'ACTIVE',
      players: {
        create: players.map((p) => ({
          userId: p.userId,
        })),
      },
    },
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

  // Add all matched players to the game's socket room and notify them
  for (const player of players) {
    const playerSocket = io.sockets.sockets.get(player.socketId);
    if (playerSocket) {
      playerSocket.join(`game:${game.id}`);
    }
  }

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

  // Notify all matched players
  io.to(`game:${game.id}`).emit('matchmaking:matched', { game: gameState });

  // Start the first round
  setTimeout(async () => {
    try {
      await startRound(io, game.id);
    } catch (err) {
      console.error('[Matchmaking] Error starting matched game:', (err as Error).message);
    }
  }, 3000); // Give players a moment to see the match screen

  console.log(`[Matchmaking] Created game ${game.id} for matched players`);
}
