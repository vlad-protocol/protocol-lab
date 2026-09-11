// Next.js calls register() once when the server process starts (both in
// `next dev` and in the `next start` process Railway runs). We use it to
// start a background timer that fires due automations without needing a
// separate cron service — see src/lib/automations.ts for which automations
// are actually safe to run unattended.
//
// Guarded by a global flag because dev's hot-reload can re-import this
// module; Railway's `next start` is a single long-lived process so this
// runs exactly once there.

const AUTO_RUN_INTERVAL_MS = 2 * 60 * 1000; // check every 2 minutes (was 15 — sequence drafts in particular felt slow)
const AUTO_RUN_MIN_GAP_MS = 15 * 60 * 1000; // still don't re-fire the same AUTOMATION inside 15 minutes; unrelated to the interval above

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as { __hqAutomationTimer?: NodeJS.Timeout };
  if (g.__hqAutomationTimer) return;

  const { runDueAutomations } = await import("@/lib/automations");
  const { runDueSequenceSteps } = await import("@/lib/sequences");
  const { runDueSequenceDraftGeneration } = await import("@/lib/sequence-drafts");
  const { runDueEmailCampaignSends, runDueSmsCampaignSends } = await import("@/lib/campaigns");

  const tick = async () => {
    try {
      const results = await runDueAutomations(AUTO_RUN_MIN_GAP_MS);
      if (results.length > 0) {
        console.log(`[automations] auto-ran ${results.length}:`, results.map((r) => r.name).join(", "));
      }
    } catch (err) {
      console.error("[automations] background run failed:", err);
    }

    try {
      // Same tick, same process — sends whatever follow-up sequence step is
      // due for any active enrollment. See src/lib/sequences.ts.
      const seqResults = await runDueSequenceSteps();
      if (seqResults.length > 0) {
        console.log(
          `[sequences] sent ${seqResults.filter((r) => !r.error).length}/${seqResults.length}:`,
          seqResults.map((r) => (r.error ? `${r.contactName} (failed: ${r.error})` : r.contactName)).join(", ")
        );
      }
    } catch (err) {
      console.error("[sequences] background run failed:", err);
    }

    try {
      // Same tick — for any sequence with requiresConfirmation on, drafts
      // the due step (researching its personalized observation) instead
      // of sending it, so it can wait for manual review in Automation
      // Confirmations. See src/lib/sequence-drafts.ts.
      const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";
      const draftResults = await runDueSequenceDraftGeneration(baseUrl);
      if (draftResults.length > 0) {
        console.log(
          `[sequences] drafted ${draftResults.filter((r) => r.drafted).length}/${draftResults.length}:`,
          draftResults.map((r) => (r.error ? `${r.contactName} (failed: ${r.error})` : r.contactName)).join(", ")
        );
      }
    } catch (err) {
      console.error("[sequences] draft generation background run failed:", err);
    }

    try {
      // Same tick — drains a batch of pending mass-email campaign sends
      // (see src/lib/campaigns.ts). Batched so a several-thousand-contact
      // campaign trickles out over many ticks instead of blowing past
      // Amazon SES's sending-rate limit in one go.
      const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";
      const emailResults = await runDueEmailCampaignSends(baseUrl);
      if (emailResults.length > 0) {
        console.log(
          `[campaigns] sent ${emailResults.filter((r) => !r.error).length}/${emailResults.length} emails`
        );
      }
    } catch (err) {
      console.error("[campaigns] email background run failed:", err);
    }

    try {
      const smsResults = await runDueSmsCampaignSends();
      if (smsResults.length > 0) {
        console.log(`[campaigns] sent ${smsResults.filter((r) => !r.error).length}/${smsResults.length} texts`);
      }
    } catch (err) {
      console.error("[campaigns] sms background run failed:", err);
    }
  };

  // Run once immediately on startup — otherwise, since setInterval waits a
  // full interval before its first fire, a freshly deployed server would
  // sit idle for AUTO_RUN_INTERVAL_MS before anything due gets picked up
  // (a newly enrolled lead's step 0, e.g., could otherwise sit for minutes
  // for no reason right after a deploy).
  tick();
  g.__hqAutomationTimer = setInterval(tick, AUTO_RUN_INTERVAL_MS);
}
