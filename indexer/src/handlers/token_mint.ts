import type { DecodedEvent, HandlerContext } from "./types.js";

export const TOKEN_MINT_TOPIC = "token_mint";

export interface TokenMintPayload {
  to: string;
  amount: string;
}

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

type RawTokenMintPayload = {
  to?: unknown;
  user?: unknown;
  amount?: unknown;
};

function normalizeAmount(amount: unknown): string {
  if (typeof amount === "bigint") return amount.toString();
  if (typeof amount === "number" && Number.isFinite(amount) && amount >= 0) return String(amount);
  if (typeof amount === "string" && /^\d+(?:\.\d+)?$/.test(amount)) return amount;
  throw new Error("token_mint amount must be a non-negative numeric value");
}

export function decodeTokenMint(event: DecodedEvent): TokenMintPayload {
  if (typeof event.data !== "object" || event.data === null || Array.isArray(event.data)) {
    throw new Error("token_mint payload must be an object");
  }

  const payload = event.data as RawTokenMintPayload;
  const to = payload.to ?? payload.user;

  if (typeof to !== "string" || !STELLAR_ADDRESS.test(to)) {
    throw new Error("token_mint recipient must be a valid Stellar public key");
  }

  return {
    to,
    amount: normalizeAmount(payload.amount),
  };
}

export async function handleTokenMint(event: DecodedEvent, context: HandlerContext): Promise<void> {
  const payload = decodeTokenMint(event);

  await context.db.query(
    `INSERT INTO token_balances (address, balance, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (address) DO UPDATE
     SET balance = token_balances.balance + EXCLUDED.balance,
         updated_at = NOW()`,
    [payload.to, payload.amount],
  );

  await context.db.query(
    `INSERT INTO events (ledger_seq, tx_hash, event_type, actor, payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [event.ledger, event.txHash, TOKEN_MINT_TOPIC, payload.to, payload],
  );

  await context.redis?.del(`token_balance:${payload.to}`, "stats:global");
}
