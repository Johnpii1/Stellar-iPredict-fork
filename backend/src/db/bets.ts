import { Pool } from 'pg';

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
 * Fetches all bets placed by a specific bettor.
 * 
 * @param pool Database pool connection
 * @param address The Stellar public key (address) of the bettor
 * @returns Array of bets made by the given bettor
 */
export async function getBetsByBettor(pool: Pool, address: string): Promise<BetRow[]> {
  const query = `
    SELECT market_id, bettor, net_amount, gross_amount, is_yes, claimed, created_at
    FROM bets
    WHERE bettor = $1
    ORDER BY created_at DESC;
  `;
  
  const result = await pool.query<BetRow>(query, [address]);
  return result.rows;
}
