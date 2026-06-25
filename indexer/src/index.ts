import { handleMarketCancelledEvent } from "./handlers/market_cancelled.js";
import type { DbClient, DecodedContractEvent, RedisClient } from "./types.js";

export async function writeEventToDb(event: DecodedContractEvent, db: DbClient, redis: RedisClient): Promise<void> {
  const [domain, action] = event.topics;

  if (domain === "mkt" && action === "cancelled") {
    await handleMarketCancelledEvent(event, db, redis);
  }
}
