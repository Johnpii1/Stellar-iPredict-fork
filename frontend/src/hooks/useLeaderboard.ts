"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getTopPlayers, getStats } from "@/services/leaderboard";
import { getMarkets, getMarketBettors } from "@/services/market";
import { getDisplayName } from "@/services/referral";
import * as cache from "@/services/cache";
import { useVisiblePoll } from "@/hooks/useVisiblePoll";
import type { PlayerStats } from "@/types";

/** Cache key for the assembled leaderboard (used for instant stale-seed). */
const LB_CACHE_KEY = "lb_assembled";

export type LeaderboardTab = "top_predictors" | "most_active" | "top_referrers";

// This poll is the HEAVIEST in the app (it fans out getMarketBettors across all
// markets). Rankings barely move minute-to-minute, so poll slowly (120s, was
// 30s) and only while the tab is visible.
const POLL_INTERVAL = 120_000;

interface UseLeaderboardResult {
  data: PlayerStats[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Sort players based on the selected tab */
function sortByTab(players: PlayerStats[], tab: LeaderboardTab): PlayerStats[] {
  const sorted = [...players];
  switch (tab) {
    case "most_active":
      return sorted.sort((a, b) => b.totalBets - a.totalBets);
    case "top_referrers":
      return sorted.sort((a, b) => b.points - a.points);
    case "top_predictors":
    default:
      return sorted.sort((a, b) => b.points - a.points);
  }
}

/**
 * Fallback: build a leaderboard from market bettors when the
 * onchain top-players list is still empty (no claims/bonuses yet).
 */
async function buildFromMarketBettors(): Promise<PlayerStats[]> {
  try {
    const markets = await getMarkets();
    if (markets.length === 0) return [];

    // Collect unique addresses across all markets
    const addressSet = new Set<string>();
    const bettorResults = await Promise.allSettled(
      markets.map((m) => getMarketBettors(m.id))
    );
    for (const r of bettorResults) {
      if (r.status === "fulfilled") {
        for (const addr of r.value) addressSet.add(addr);
      }
    }
    if (addressSet.size === 0) return [];

    // For each unique bettor, fetch their leaderboard stats + display name
    const addresses = Array.from(addressSet);
    const results = await Promise.allSettled(
      addresses.map(async (addr) => {
        const [stats, name] = await Promise.all([
          getStats(addr),
          getDisplayName(addr).catch(() => ""),
        ]);
        return {
          address: addr,
          displayName: name || "",
          points: stats?.points ?? 0,
          totalBets: stats?.totalBets ?? 0,
          wonBets: stats?.wonBets ?? 0,
          lostBets: stats?.lostBets ?? 0,
          winRate: stats && stats.totalBets > 0
            ? (stats.wonBets / stats.totalBets) * 100
            : 0,
        } satisfies PlayerStats;
      })
    );
    return results
      .filter((r): r is PromiseFulfilledResult<PlayerStats> => r.status === "fulfilled")
      .map((r) => r.value);
  } catch {
    return [];
  }
}

export function useLeaderboard(
  tab?: LeaderboardTab
): UseLeaderboardResult {
  // Seed from stale cache so the leaderboard renders instantly on return,
  // then refresh in the background.
  const seeded = useRef(cache.getStale<PlayerStats[]>(LB_CACHE_KEY));
  const [allPlayers, setAllPlayers] = useState<PlayerStats[]>(seeded.current ?? []);
  const [data, setData] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(!seeded.current);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  const fetchData = useCallback(async (silent = false) => {
    // Only show loading spinner on first load with no seed, not during polling
    if (!silent) setLoading(true);
    setError(null);
    try {
      let players = await getTopPlayers(50);

      // Fallback: if the onchain leaderboard is empty, construct from
      // market bettors (covers the period before any claim/bonus awards).
      if (players.length === 0) {
        players = await buildFromMarketBettors();
      }

      if (!mountedRef.current) return;
      // Persist assembled leaderboard for instant stale-seed next time
      cache.set(LB_CACHE_KEY, players, 60_000);
      setAllPlayers(players);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard"
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        initialLoadDone.current = true;
      }
    }
  }, []);

  // Initial fetch — silent (background) if we already seeded from cache
  useEffect(() => {
    mountedRef.current = true;
    fetchData(seeded.current !== null && seeded.current.length > 0);
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll while visible (silent). Pauses when the tab is hidden.
  useVisiblePoll(() => {
    if (initialLoadDone.current) fetchData(true);
  }, POLL_INTERVAL);

  // Re-sort when tab or allPlayers changes
  useEffect(() => {
    setData(sortByTab(allPlayers, tab ?? "top_predictors"));
  }, [allPlayers, tab]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}
