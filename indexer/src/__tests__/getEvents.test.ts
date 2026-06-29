import { describe, expect, it, vi, beforeEach } from "vitest";
import { rpc } from "@stellar/stellar-sdk";
import { SorobanRpcClient, LedgerGapError } from "../rpc/getEvents.js";

describe("SorobanRpcClient.getEvents", () => {
  let client: SorobanRpcClient;

  beforeEach(() => {
    client = new SorobanRpcClient("https://mock-rpc-url.stellar.org");
    vi.restoreAllMocks();
  });

  it("successfully retrieves and maps events on the happy path", async () => {
    const mockEventsResponse = {
      events: [
        {
          contractId: { toString: () => "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
          ledger: 1000,
          type: "contract",
          topic: ["mkt", "cancelled"],
          value: "XDR_VAL",
        },
      ],
      latestLedger: 1005,
    };

    const spy = vi
      .spyOn(rpc.Server.prototype, "getEvents")
      .mockResolvedValue(mockEventsResponse as any);

    const result = await client.getEvents({
      startLedger: 1000,
      contractIds: ["CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
    });

    expect(spy).toHaveBeenCalledWith({
      startLedger: 1000,
      filters: [
        {
          type: "contract",
          contractIds: ["CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
        },
      ],
      limit: 100,
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ledger: 1000,
      type: "contract",
      body: mockEventsResponse.events[0],
    });
    expect(result.latestLedger).toBe(1005);
  });

  it("throws LedgerGapError when startLedger is too old", async () => {
    const rpcError = new Error("startLedger is less than the oldest ledger stored in this node (100000)");

    vi.spyOn(rpc.Server.prototype, "getEvents").mockRejectedValue(rpcError);

    await expect(
      client.getEvents({
        startLedger: 5000,
        contractIds: ["CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
      })
    ).rejects.toThrow(LedgerGapError);

    await expect(
      client.getEvents({
        startLedger: 5000,
        contractIds: ["CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
      })
    ).rejects.toThrow(/re-backfill/);
  });

  it("propagates other unrelated errors without modification", async () => {
    const rpcError = new Error("network timeout");

    vi.spyOn(rpc.Server.prototype, "getEvents").mockRejectedValue(rpcError);

    await expect(
      client.getEvents({
        startLedger: 5000,
        contractIds: ["CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
      })
    ).rejects.toThrow("network timeout");

    await expect(
      client.getEvents({
        startLedger: 5000,
        contractIds: ["CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
      })
    ).rejects.not.toThrow(LedgerGapError);
  });
});
