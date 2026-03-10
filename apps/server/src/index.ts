import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRouter from './routes/auth';
import gamesRouter from './routes/games';
import usersRouter from './routes/users';
import dictionaryRouter from './routes/dictionary';
import { initializeSocketHandlers } from './socket/handlers';
import { initRedis } from './lib/redis';
import { loadDictionaries } from './services/dictionary';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function main(): Promise<void> {
  // Create Express app
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    })
  );

  // JSON body parser
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount REST routes
  app.use('/api/auth', authRouter);
  app.use('/api/games', gamesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/dictionary', dictionaryRouter);

  // Also mount without /api prefix for backwards compatibility
  app.use('/auth', authRouter);
  app.use('/games', gamesRouter);
  app.use('/users', usersRouter);
  app.use('/dictionary', dictionaryRouter);

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Load dictionaries
  loadDictionaries();

  // Connect to Redis (with graceful fallback)
  try {
    await initRedis();
  } catch (err) {
    console.warn('[Server] Redis not available, using in-memory fallback');
  }

  // Initialize socket handlers
  initializeSocketHandlers(io);

  // Start listening
  httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🎮 ארץ עיר - Country City Server      ║
║                                            ║
║     Running on port ${PORT}                   ║
║     Environment: ${process.env.NODE_ENV || 'development'}            ║
╚════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Server] Shutting down gracefully...');
    httpServer.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
