// Next.js calls register() once when the server process starts (both in
// `next dev` and in the `next start` process Railway runs). We use it to
// start a background timer that fires due automations without needing a
// separate cron service — see src/lib/automations.ts for which automations
// are actually safe to run unattended.
//
// Guarded by a global flag because dev's hot-reload can re-import this
// module; Railway's `next start` is a single long-lived process so this
// runs exactly once there.

const AUTO_RUN_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes
const AUTO_RUN_MIN_GAP_MS = 15 * 60 * 1000; // don't re-fire the same automation inside 15 minutes

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as { __hqAutomationTimer?: NodeJS.Timeout };
  if (g.__hqAutomationTimer) return;

  const { runDueAutomations } = await import("@/lib/automations");

  g.__hqAutomationTimer = setInterval(async () => {
    try {
      const results = await runDueAutomations(AUTO_RUN_MIN_GAP_MS);
      if (results.length > 0) {
        console.log(`[automations] auto-ran ${results.length}:`, results.map((r) => r.name).join(", "));
      }
    } catch (err) {
      console.error("[automations] background run failed:", err);
    }
  }, AUTO_RUN_INTERVAL_MS);
}
