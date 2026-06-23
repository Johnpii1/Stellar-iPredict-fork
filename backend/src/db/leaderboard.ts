import { Pool } from 'pg';

export type SortOption = 'points' | 'bets';

export interface GetLeaderboardParams {
  limit: number;
  offset: number;
  sort: SortOption;
}

export interface LeaderboardRow {
  address: string;
  display_name: string | null;
  points: string;
  won_bets: number;
  lost_bets: number;
  updated_at: Date;
}

/**
 * Fetches a paginated and sorted leaderboard.
 * 
 * @param pool Database pool connection
 * @param params Pagination and sorting parameters
 * @returns Array of leaderboard entries
 */
export async function getLeaderboard(pool: Pool, params: GetLeaderboardParams): Promise<LeaderboardRow[]> {
  const { limit, offset, sort } = params;
  
  // Use strictly mapped static queries to avoid string interpolation.
  // We cannot parameterize the ORDER BY clause in PostgreSQL,
  // so static full query strings are the safest way to prevent SQL injection.
  if (sort === 'bets') {
    const query = `
      SELECT address, display_name, points, won_bets, lost_bets, updated_at
      FROM leaderboard
      ORDER BY (won_bets + lost_bets) DESC
      LIMIT $1 OFFSET $2;
    `;
    const result = await pool.query<LeaderboardRow>(query, [limit, offset]);
    return result.rows;
  }

  // Default to sorting by points
  const query = `
    SELECT address, display_name, points, won_bets, lost_bets, updated_at
    FROM leaderboard
    ORDER BY points DESC
    LIMIT $1 OFFSET $2;
  `;
  const result = await pool.query<LeaderboardRow>(query, [limit, offset]);
  return result.rows;
}
