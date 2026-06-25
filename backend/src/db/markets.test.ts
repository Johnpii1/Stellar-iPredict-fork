import { describe, it, expect, vi } from "vitest";
import { getMarketById, type Market } from "./markets";

const baseRow = {
  id: 1,
  question: "Will BTC hit $150k?",
  image_url: "https://example.com/btc.png",
  category: "Crypto",
  end_time: 1700000000,
  total_yes: 100,
  total_no: 50,
  resolved: false,
  outcome: null as boolean | null,
  cancelled: false,
  creator: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  bet_count: 10,
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-02T00:00:00Z"),
};

function createMockPool(rows: unknown[]): unknown {
  return {
    query: () => Promise.resolve({ rows }),
  };
}

describe("getMarketById", () => {
  it("returns a market when found", async () => {
    const pool = createMockPool([baseRow]) as Parameters<typeof getMarketById>[0];
    const market = await getMarketById(pool, 1);

    expect(market).not.toBeNull();
    expect(market!.id).toBe(1);
    expect(market!.question).toBe("Will BTC hit $150k?");
    expect(market!.imageUrl).toBe("https://example.com/btc.png");
    expect(market!.category).toBe("Crypto");
    expect(market!.endTime).toBe(1700000000);
    expect(market!.totalYes).toBe(100);
    expect(market!.totalNo).toBe(50);
    expect(market!.resolved).toBe(false);
    expect(market!.outcome).toBeNull();
    expect(market!.cancelled).toBe(false);
    expect(market!.creator).toBe("GABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
    expect(market!.betCount).toBe(10);
    expect(market!.createdAt).toEqual(baseRow.created_at);
    expect(market!.updatedAt).toEqual(baseRow.updated_at);
  });

  it("returns null when no market matches the ID", async () => {
    const pool = createMockPool([]) as Parameters<typeof getMarketById>[0];
    const market = await getMarketById(pool, 999);
    expect(market).toBeNull();
  });

  it("uses a parameterized query with the provided ID", async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [baseRow] });
    const pool = { query: queryMock } as unknown as Parameters<typeof getMarketById>[0];

    await getMarketById(pool, 42);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("WHERE id = $1");
    expect(params).toEqual([42]);
  });
});
