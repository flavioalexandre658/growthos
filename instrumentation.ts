export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      console.log("[instrumentation] Skipping workers in development (no Redis required)");
      return;
    }

    const { startWorkers, stopWorkers } = await import("./workers/register");
    const { startEventFlushTimer, stopEventFlushTimer, flushEventBuffer } = await import("./utils/event-buffer");

    await startWorkers();
    startEventFlushTimer();

    const shutdown = async () => {
      stopEventFlushTimer();
      await flushEventBuffer().catch(() => {});
      await stopWorkers();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}
