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

const STELLAR_ADDRESS = /^[GC][A-Z2-7]{55}$/;
const DISPLAY_NAME_MAX = 50; // leaderboard.display_name is VARCHAR(50)

// Welcome bonus credited to the registrant on first registration (contract:
// WELCOME_BONUS_POINTS). The registration-time bonus credited to the referrer
// is kept in lockstep with the leaderboard-rebuild reducer so incremental
// writes and full replays converge on the same snapshot.
const DEFAULT_WELCOME_POINTS = 5;
const DEFAULT_REFERRER_POINTS = 5;

function parsePoints(value: unknown, fallback: number, label: string): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ZodValidationError(`${label} must be a non-negative integer`);
  }
  return parsed;
}

function parseDisplayName(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ZodValidationError("display_name must be a string");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > DISPLAY_NAME_MAX) {
    throw new ZodValidationError(`display_name must be at most ${DISPLAY_NAME_MAX} characters`);
  }
  return trimmed;
}

export const referralRegisteredPayloadSchema = schema((value: unknown) => {
  // On-chain shape: register_referral(user, display_name, referrer?).
  let candidate: any = value;
  if (Array.isArray(value)) {
    candidate = {
      user: value[0],
      display_name: value[1],
      referrer: value[2],
    };
  }

  if (candidate === null || typeof candidate !== "object") {
    throw new ZodValidationError("referral_registered payload must be an object or tuple");
  }

  const user = candidate.user ?? candidate.address ?? candidate.registrant;
  if (typeof user !== "string" || !STELLAR_ADDRESS.test(user)) {
    throw new ZodValidationError("user must be a valid Stellar address");
  }

  const displayName = parseDisplayName(candidate.display_name ?? candidate.displayName ?? candidate.name);

  let referrer: string | null = null;
  const rawReferrer = candidate.referrer ?? candidate.referrer_address;
  if (rawReferrer !== undefined && rawReferrer !== null) {
    if (typeof rawReferrer !== "string" || !STELLAR_ADDRESS.test(rawReferrer)) {
      throw new ZodValidationError("referrer must be a valid Stellar address");
    }
    if (rawReferrer === user) {
      throw new ZodValidationError("referrer must not equal user (self-referral)");
    }
    referrer = rawReferrer;
  }

  const welcomePoints = parsePoints(
    candidate.welcome_bonus_points ?? candidate.welcome_points ?? candidate.points,
    DEFAULT_WELCOME_POINTS,
    "welcome_bonus_points",
  );
  const referrerPoints = parsePoints(
    candidate.referrer_bonus_points ?? candidate.bonus_points ?? candidate.referral_points,
    DEFAULT_REFERRER_POINTS,
    "referrer_bonus_points",
  );

  return {
    user,
    display_name: displayName,
    referrer,
    welcome_points: welcomePoints,
    referrer_points: referrerPoints,
  };
});

export type ReferralRegisteredPayload = Infer<typeof referralRegisteredPayloadSchema>;

