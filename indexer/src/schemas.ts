import { schema, ZodValidationError } from "./zod.js";
import type { infer as Infer } from "./zod.js";

function parseMarketId(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new ZodValidationError("market_id must be a non-negative safe integer");
    }
    return value;
  }

  if (typeof value === "bigint" || typeof value === "string") {
    const text = value.toString();
    if (!/^\d+$/.test(text)) {
      throw new ZodValidationError("market_id must be an unsigned integer string");
    }
    const parsed = Number(text);
    if (!Number.isSafeInteger(parsed)) {
      throw new ZodValidationError("market_id exceeds JavaScript safe integer range");
    }
    return parsed;
  }

  throw new ZodValidationError("market_id is required");
}

export const marketCancelledPayloadSchema = schema((value: unknown) => {
  const candidate = Array.isArray(value) ? { market_id: value[0] } : value;

  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ZodValidationError("market_cancelled payload must be an object or single-value tuple");
  }

  const keys = Object.keys(candidate);
  if (keys.some((key) => key !== "market_id")) {
    throw new ZodValidationError("market_cancelled payload contains unknown fields");
  }

  return { market_id: parseMarketId((candidate as { market_id?: unknown }).market_id) };
});

export type MarketCancelledPayload = Infer<typeof marketCancelledPayloadSchema>;

export const referralRewardPayloadSchema = schema((value: unknown) => {
  let candidate: any = value;
  if (Array.isArray(value)) {
    candidate = {
      referrer: value[0],
      points: value[1] !== undefined ? value[1] : undefined
    };
  }

  if (candidate === null || typeof candidate !== "object") {
    throw new ZodValidationError("referral_reward payload must be an object or tuple");
  }

  const referrer = candidate.referrer;
  if (typeof referrer !== "string" || !/^[GC][A-Z2-7]{55}$/.test(referrer)) {
    throw new ZodValidationError("referrer must be a valid Stellar address");
  }

  let points = 3;
  if (candidate.points !== undefined && candidate.points !== null) {
    const p = Number(candidate.points);
    if (!Number.isSafeInteger(p) || p <= 0) {
      throw new ZodValidationError("points must be a positive integer");
    }
    points = p;
  }

  return { referrer, points };
});

export type ReferralRewardPayload = Infer<typeof referralRewardPayloadSchema>;

