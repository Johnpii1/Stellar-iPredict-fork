import type { RedisClient } from "./types.js";

export async function invalidateMarketCache(redis: RedisClient, marketId: number): Promise<void> {
  await redis.del(`market:${marketId}`, "markets:all", "markets:active");
}

export async function invalidateLeaderboardCache(redis: RedisClient): Promise<void> {
  await redis.del("leaderboard:top20");
}

