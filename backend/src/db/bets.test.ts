import * as assert from "assert";
import { upsertBet, DbClient, BetRow } from "./bets";

async function testInsertNewBet() {
  const mockCreatedDate = new Date("2026-06-25T19:00:00Z");
  let queryCalled = 0;
  let capturedSql = "";
  let capturedParams: any[] = [];

  const mockDb: DbClient = {
    query: async (sql: string, params?: any[]) => {
      queryCalled++;
      capturedSql = sql;
      capturedParams = params || [];
      return {
        rows: [
          {
            market_id: "1",
            bettor: "GB2C3Y...",
            net_amount: "98.0000000",
            gross_amount: "100.0000000",
            is_yes: true,
            claimed: false,
            created_at: mockCreatedDate,
          } as BetRow,
        ],
      };
    },
  };

  const params = {
    market_id: 1,
    bettor: "GB2C3Y...",
    net_amount: 98.0,
    gross_amount: 100.0,
    is_yes: true,
  };

  const result = await upsertBet(mockDb, params);

  assert.strictEqual(queryCalled, 1);
  assert.ok(capturedSql.includes("INSERT INTO bets"));
  assert.deepStrictEqual(capturedParams, ["1", "GB2C3Y...", "98", "100", true, false]);
  assert.deepStrictEqual(result, {
    market_id: "1",
    bettor: "GB2C3Y...",
    net_amount: "98.0000000",
    gross_amount: "100.0000000",
    is_yes: true,
    claimed: false,
    created_at: mockCreatedDate,
  });
  console.log("✓ testInsertNewBet passed");
}

async function testPropagateParameters() {
  const mockCreatedDate = new Date("2026-06-25T19:05:00Z");
  let queryCalled = 0;
  let capturedSql = "";
  let capturedParams: any[] = [];

  const mockDb: DbClient = {
    query: async (sql: string, params?: any[]) => {
      queryCalled++;
      capturedSql = sql;
      capturedParams = params || [];
      return {
        rows: [
          {
            market_id: "42",
            bettor: "GB777...",
            net_amount: "196.0000000",
            gross_amount: "200.0000000",
            is_yes: false,
            claimed: true,
            created_at: mockCreatedDate,
          } as BetRow,
        ],
      };
    },
  };

  const params = {
    market_id: "42",
    bettor: "GB777...",
    net_amount: "196",
    gross_amount: "200",
    is_yes: false,
    claimed: true,
  };

  const result = await upsertBet(mockDb, params);

  assert.strictEqual(queryCalled, 1);
  assert.ok(capturedSql.includes("INSERT INTO bets"));
  assert.deepStrictEqual(capturedParams, ["42", "GB777...", "196", "200", false, true]);
  assert.deepStrictEqual(result, {
    market_id: "42",
    bettor: "GB777...",
    net_amount: "196.0000000",
    gross_amount: "200.0000000",
    is_yes: false,
    claimed: true,
    created_at: mockCreatedDate,
  });
  console.log("✓ testPropagateParameters passed");
}

async function testThrowErrorOnEmptyResult() {
  const mockDb: DbClient = {
    query: async () => {
      return { rows: [] };
    },
  };

  const params = {
    market_id: "1",
    bettor: "GB2C3Y...",
    net_amount: "98",
    gross_amount: "100",
    is_yes: true,
  };

  await assert.rejects(
    async () => {
      await upsertBet(mockDb, params);
    },
    /Failed to upsert bet: no row returned/
  );
  console.log("✓ testThrowErrorOnEmptyResult passed");
}

async function main() {
  try {
    await testInsertNewBet();
    await testPropagateParameters();
    await testThrowErrorOnEmptyResult();
    console.log("\nAll tests passed successfully!");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

main();
