import type { Pool } from "pg";

/**
 * Shape of a market record returned from the database.
 */
export interface Market {
  id: number;
  question: string;
  imageUrl: string;
  category: string;
  endTime: number;
  totalYes: number;
  totalNo: number;
  resolved: boolean;
  outcome: boolean | null;
  cancelled: boolean;
  creator: string;
  betCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MarketRow {
  id: number;
  question: string;
  image_url: string;
  category: string;
  end_time: number;
  total_yes: number;
  total_no: number;
  resolved: boolean;
  outcome: boolean | null;
  cancelled: boolean;
  creator: string;
  bet_count: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Fetch a single market by its numeric ID.
 *
 * Returns the matching market row or `null` when no market exists for the given ID.
 * Uses a parameterized query to prevent SQL injection.
 */
export async function getMarketById(pool: Pool, id: number): Promise<Market | null> {
  const { rows } = await pool.query<MarketRow>(
    `SELECT id, question, image_url, category, end_time, total_yes, total_no,
            resolved, outcome, cancelled, creator, bet_count, created_at, updated_at
     FROM markets
     WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as MarketRow;
  return {
    id: row.id,
    question: row.question,
    imageUrl: row.image_url,
    category: row.category,
    endTime: row.end_time,
    totalYes: row.total_yes,
    totalNo: row.total_no,
    resolved: row.resolved,
    outcome: row.outcome,
    cancelled: row.cancelled,
    creator: row.creator,
    betCount: row.bet_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
