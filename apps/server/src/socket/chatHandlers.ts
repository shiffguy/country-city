import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import prisma from '../lib/prisma';

const chatMessageSchema = z.object({
  gameId: z.string().uuid(),
  message: z.string().min(1).max(500).trim(),
});

export function registerChatHandlers(io: Server, socket: Socket): void {
  const userId = (socket.data as { userId: string }).userId;

  /**
   * chat:send - Send a chat message in a game
   */
  socket.on('chat:send', async (data: unknown, callback?: (response: any) => void) => {
    try {
      const parsed = chatMessageSchema.safeParse(data);
      if (!parsed.success) {
        const errorResponse = { error: 'Invalid input', details: parsed.error.issues };
        if (callback) callback(errorResponse);
        else socket.emit('chat:error', errorResponse);
        return;
      }

      const { gameId, message } = parsed.data;

      // Verify user is in the game
      const gamePlayer = await prisma.gamePlayer.findUnique({
        where: {
          gameId_userId: {
            gameId,
            userId,
          },
        },
      });

      if (!gamePlayer) {
        const errorResponse = { error: 'You are not in this game' };
        if (callback) callback(errorResponse);
        else socket.emit('chat:error', errorResponse);
        return;
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nickname: true, avatarUrl: true },
      });

      // Save message to DB
      const chatMessage = await prisma.chatMessage.create({
        data: {
          gameId,
          userId,
          message,
        },
      });

      // Emit to all players in the game room
      io.to(`game:${gameId}`).emit('chat:message', {
        id: chatMessage.id,
        gameId,
        userId,
        user: user || { id: userId, nickname: 'Unknown' },
        message,
        createdAt: chatMessage.createdAt,
      });

      if (callback) callback({ success: true, messageId: chatMessage.id });
    } catch (err) {
      console.error('[Chat] Error sending message:', (err as Error).message);
      const errorResponse = { error: 'Failed to send message' };
      if (callback) callback(errorResponse);
      else socket.emit('chat:error', errorResponse);
    }
  });
}
