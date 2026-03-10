import { getRedisClient, isRedisConnected } from '../lib/redis';

interface QueueEntry {
  userId: string;
  socketId: string;
  rating: number;
  joinedAt: number; // timestamp
}

export interface MatchResult {
  players: QueueEntry[];
}

// In-memory fallback queue
const memoryQueue = new Map<string, QueueEntry>();

// Callback for when a match is found
type MatchCallback = (match: MatchResult) => void;
let onMatchFound: MatchCallback | null = null;

// Matching interval
let matchInterval: NodeJS.Timeout | null = null;

const REDIS_QUEUE_KEY = 'matchmaking:queue';
const MIN_PLAYERS = 2;
const PREFERRED_PLAYERS = 4;
const WAIT_THRESHOLD_MS = 15000; // 15 seconds before accepting smaller groups
const MATCH_CHECK_INTERVAL_MS = 2000; // Check every 2 seconds
const RATING_RANGE = 200; // Initial rating range for matching

/**
 * Add a player to the matchmaking queue
 */
export async function joinQueue(
  userId: string,
  socketId: string,
  rating: number
): Promise<void> {
  const entry: QueueEntry = {
    userId,
    socketId,
    rating,
    joinedAt: Date.now(),
  };

  if (isRedisConnected()) {
    const redis = getRedisClient()!;
    await redis.hset(REDIS_QUEUE_KEY, userId, JSON.stringify(entry));
  } else {
    memoryQueue.set(userId, entry);
  }

  console.log(`[Matchmaking] Player ${userId} joined queue (rating: ${rating})`);
}

/**
 * Remove a player from the matchmaking queue
 */
export async function leaveQueue(userId: string): Promise<void> {
  if (isRedisConnected()) {
    const redis = getRedisClient()!;
    await redis.hdel(REDIS_QUEUE_KEY, userId);
  } else {
    memoryQueue.delete(userId);
  }

  console.log(`[Matchmaking] Player ${userId} left queue`);
}

/**
 * Get all players currently in the queue
 */
async function getQueueEntries(): Promise<QueueEntry[]> {
  if (isRedisConnected()) {
    const redis = getRedisClient()!;
    const all = await redis.hgetall(REDIS_QUEUE_KEY);
    return Object.values(all).map((v) => JSON.parse(v) as QueueEntry);
  } else {
    return Array.from(memoryQueue.values());
  }
}

/**
 * Remove multiple players from the queue
 */
async function removeFromQueue(userIds: string[]): Promise<void> {
  if (isRedisConnected()) {
    const redis = getRedisClient()!;
    if (userIds.length > 0) {
      await redis.hdel(REDIS_QUEUE_KEY, ...userIds);
    }
  } else {
    for (const userId of userIds) {
      memoryQueue.delete(userId);
    }
  }
}

/**
 * Try to form a match from queued players.
 *
 * Strategy:
 * - Sort players by rating
 * - Try to match groups with similar ratings
 * - Prefer groups of PREFERRED_PLAYERS (4)
 * - If any players have been waiting > WAIT_THRESHOLD_MS, accept MIN_PLAYERS (2-3)
 */
export async function tryMatch(): Promise<MatchResult | null> {
  const entries = await getQueueEntries();

  if (entries.length < MIN_PLAYERS) {
    return null;
  }

  // Sort by rating for better matching
  entries.sort((a, b) => a.rating - b.rating);

  const now = Date.now();
  const hasLongWaiters = entries.some(
    (e) => now - e.joinedAt > WAIT_THRESHOLD_MS
  );

  // Try to form a group of PREFERRED_PLAYERS first
  if (entries.length >= PREFERRED_PLAYERS) {
    // Find the best cluster of PREFERRED_PLAYERS with closest ratings
    let bestGroup: QueueEntry[] | null = null;
    let bestSpread = Infinity;

    for (let i = 0; i <= entries.length - PREFERRED_PLAYERS; i++) {
      const group = entries.slice(i, i + PREFERRED_PLAYERS);
      const spread = group[group.length - 1].rating - group[0].rating;
      if (spread < bestSpread) {
        bestSpread = spread;
        bestGroup = group;
      }
    }

    if (bestGroup) {
      const matchedIds = bestGroup.map((e) => e.userId);
      await removeFromQueue(matchedIds);
      console.log(
        `[Matchmaking] Matched ${PREFERRED_PLAYERS} players: ${matchedIds.join(', ')}`
      );
      return { players: bestGroup };
    }
  }

  // If players have been waiting too long, accept a smaller group
  if (hasLongWaiters && entries.length >= MIN_PLAYERS) {
    const groupSize = Math.min(entries.length, PREFERRED_PLAYERS);

    // Pick the players who have waited longest, but still try for rating proximity
    const waitingSorted = [...entries].sort((a, b) => a.joinedAt - b.joinedAt);
    const group = waitingSorted.slice(0, groupSize);

    const matchedIds = group.map((e) => e.userId);
    await removeFromQueue(matchedIds);
    console.log(
      `[Matchmaking] Matched ${groupSize} players (long wait): ${matchedIds.join(', ')}`
    );
    return { players: group };
  }

  return null;
}

/**
 * Set the callback to be invoked when a match is found
 */
export function setMatchCallback(callback: MatchCallback): void {
  onMatchFound = callback;
}

/**
 * Start the periodic match-checking loop
 */
export function startMatchmaking(): void {
  if (matchInterval) {
    clearInterval(matchInterval);
  }

  matchInterval = setInterval(async () => {
    try {
      const match = await tryMatch();
      if (match && onMatchFound) {
        onMatchFound(match);
      }
    } catch (err) {
      console.error('[Matchmaking] Error during match check:', (err as Error).message);
    }
  }, MATCH_CHECK_INTERVAL_MS);

  console.log('[Matchmaking] Started matchmaking loop');
}

/**
 * Stop the match-checking loop
 */
export function stopMatchmaking(): void {
  if (matchInterval) {
    clearInterval(matchInterval);
    matchInterval = null;
  }
  console.log('[Matchmaking] Stopped matchmaking loop');
}

/**
 * Get the number of players in the queue
 */
export async function getQueueSize(): Promise<number> {
  if (isRedisConnected()) {
    const redis = getRedisClient()!;
    return redis.hlen(REDIS_QUEUE_KEY);
  } else {
    return memoryQueue.size;
  }
}

export default {
  joinQueue,
  leaveQueue,
  tryMatch,
  setMatchCallback,
  startMatchmaking,
  stopMatchmaking,
  getQueueSize,
};
