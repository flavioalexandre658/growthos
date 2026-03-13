import { startWorkers, stopWorkers } from "./workers/register";
import { startPageviewFlushTimer, stopPageviewFlushTimer, flushPageviewBuffer } from "./utils/pageview-buffer";

async function main() {
  console.log("[worker-entrypoint] Starting workers...");
  startWorkers();
  startPageviewFlushTimer();

  const shutdown = async () => {
    console.log("[worker-entrypoint] Shutting down...");
    stopPageviewFlushTimer();
    await flushPageviewBuffer().catch(() => {});
    await stopWorkers();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log("[worker-entrypoint] Workers running. Waiting for jobs...");
}

main().catch((err) => {
  console.error("[worker-entrypoint] Fatal error:", err);
  process.exit(1);
});
