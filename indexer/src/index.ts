/**
 * iPredict Soroban Event Indexer — entrypoint.
 *
 * Minimal scaffold. The real polling loop, getEvents client, event decoders,
 * checkpoint store, and DB writers are tracked as separate issues
 * (see GitHub issues labelled `area:indexer`).
 *
 * Run: `npm run dev`
 */

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5000);

async function main(): Promise<void> {
  // TODO(#scaffold): replace with the real polling loop once the
  // "Implement getEvents polling loop" issue is done.
  console.log(`[ipredict-indexer] scaffold up — polling loop not yet implemented`);
  console.log(`[ipredict-indexer] intended interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`[ipredict-indexer] pick an issue labelled "area:indexer" to start`);
}

main().catch((err) => {
  console.error("[ipredict-indexer] fatal:", err);
  process.exit(1);
});
