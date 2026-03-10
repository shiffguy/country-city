import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisConnected(): boolean {
  return isRedisAvailable;
}

export async function initRedis(): Promise<Redis | null> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return new Promise((resolve) => {
    try {
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 3) {
            console.warn('[Redis] Max retries reached, giving up');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      client.on('connect', () => {
        console.log('[Redis] Connected successfully');
        isRedisAvailable = true;
      });

      client.on('error', (err: Error) => {
        console.warn('[Redis] Connection error:', err.message);
        isRedisAvailable = false;
      });

      client.on('close', () => {
        console.warn('[Redis] Connection closed');
        isRedisAvailable = false;
      });

      client
        .connect()
        .then(() => {
          redisClient = client;
          isRedisAvailable = true;
          resolve(client);
        })
        .catch((err: Error) => {
          console.warn('[Redis] Failed to connect:', err.message);
          console.warn('[Redis] Falling back to in-memory storage for matchmaking');
          isRedisAvailable = false;
          resolve(null);
        });
    } catch (err) {
      console.warn('[Redis] Failed to initialize:', (err as Error).message);
      console.warn('[Redis] Falling back to in-memory storage for matchmaking');
      resolve(null);
    }
  });
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}

export default {
  getRedisClient,
  isRedisConnected,
  initRedis,
  disconnectRedis,
};
