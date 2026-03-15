export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      console.log("[instrumentation] Skipping workers in development (no Redis required)");
      return;
    }

    const { startWorkers, stopWorkers } = await import("./workers/register");
    const { startPageviewFlushTimer, stopPageviewFlushTimer, flushPageviewBuffer } = await import("./utils/pageview-buffer");

    await startWorkers();
    startPageviewFlushTimer();

    const shutdown = async () => {
      stopPageviewFlushTimer();
      await flushPageviewBuffer().catch(() => {});
      await stopWorkers();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}
