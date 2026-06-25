export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}

export interface UpsertBetParams {
  market_id: string | number | bigint;
  bettor: string;
  net_amount: string | number;
  gross_amount: string | number;
  is_yes: boolean;
  claimed?: boolean;
}

export interface BetRow {
  market_id: string;
  bettor: string;
  net_amount: string;
  gross_amount: string;
  is_yes: boolean;
  claimed: boolean;
  created_at: Date;
}

/**
 * Upserts a bet. If a bet already exists for the given (market_id, bettor),
 * it accumulates the net_amount and gross_amount, and updates claimed status.
 *
 * @param db The database client or pool executing the query
 * @param params The bet data to insert or update
 * @returns The upserted bet row from the database
 */
export async function upsertBet(db: DbClient, params: UpsertBetParams): Promise<BetRow> {
  const queryText = `
    INSERT INTO bets (market_id, bettor, net_amount, gross_amount, is_yes, claimed)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (market_id, bettor) DO UPDATE
    SET net_amount = (bets.net_amount + EXCLUDED.net_amount),
        gross_amount = (bets.gross_amount + EXCLUDED.gross_amount),
        claimed = EXCLUDED.claimed
    RETURNING market_id, bettor, net_amount, gross_amount, is_yes, claimed, created_at;
  `;

  const claimedValue = params.claimed !== undefined && params.claimed !== null ? params.claimed : false;

  const values = [
    params.market_id.toString(),
    params.bettor,
    params.net_amount.toString(),
    params.gross_amount.toString(),
    params.is_yes,
    claimedValue,
  ];

  const result = await db.query<BetRow>(queryText, values);
  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error("Failed to upsert bet: no row returned");
  }
  return result.rows[0];
}
