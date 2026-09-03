import { prisma } from "@/lib/prisma";
import { sendGmail } from "@/lib/integrations/gmail";

function fillTemplate(text: string, contact: { contactName: string; companyName: string | null }) {
  return text
    .replaceAll("{{contactName}}", contact.contactName)
    .replaceAll("{{companyName}}", contact.companyName || "");
}

// Whether it's safe to fire this automation on a recurring timer, with no
// human clicking "Run now" first. Two things make that safe: the trigger is
// naturally incremental (it only ever matches *new* activity since the last
// run, so re-running can't double-fire), or the action itself is idempotent
// (running it again on the same contact is a no-op). Everything else stays
// manual-only on purpose — e.g. "tag added" + "send email" would otherwise
// re-send that email to the same contact every single tick forever.
export function isSafeToAutoRun(automation: { triggerType: string; actionType: string }) {
  if (automation.triggerType === "NEW_CONTACT") return true; // scoped to createdAt > lastRunAt
  if (automation.triggerType === "NO_REPLY_DAYS") return true; // its own action logs an
  // outbound interaction, which pushes the contact's "last contact" date
  // forward — so the same contact stops matching until they go quiet again.
  if (automation.triggerType === "TAG_ADDED" && automation.actionType === "ADD_TAG") return true; // no-op once tagged
  return false; // TAG_ADDED + email/note, and MANUAL, stay click-to-run.
}

// Runs every AUTO_RUN_INTERVAL_MS in production (see instrumentation.ts) for
// every enabled automation that's safe to fire unattended, skipping any run
// again within AUTO_RUN_MIN_GAP_MS of its last run.
export async function runDueAutomations(minGapMs: number) {
  const automations = await prisma.automation.findMany({ where: { enabled: true } });
  const due = automations.filter(
    (a) =>
      isSafeToAutoRun(a) &&
      (!a.lastRunAt || Date.now() - a.lastRunAt.getTime() >= minGapMs)
  );
  const results: { id: string; name: string; result?: Awaited<ReturnType<typeof runAutomation>>; error?: string }[] = [];
  for (const automation of due) {
    try {
      const result = await runAutomation(automation.id);
      results.push({ id: automation.id, name: automation.name, result });
    } catch (err) {
      results.push({ id: automation.id, name: automation.name, error: err instanceof Error ? err.message : "failed" });
    }
  }
  return results;
}

// Runs on demand (the "Run now" button), and also automatically — see
// isSafeToAutoRun/runDueAutomations above and instrumentation.ts, which
// fires this on a timer inside the running server process. No separate
// Railway cron service needed.
export async function runAutomation(automationId: string) {
  const automation = await prisma.automation.findUnique({ where: { id: automationId } });
  if (!automation) throw new Error("Automation not found.");

  const triggerConfig = (automation.triggerConfig as Record<string, unknown>) || {};
  const actionConfig = (automation.actionConfig as Record<string, unknown>) || {};

  let contacts: Awaited<ReturnType<typeof prisma.contact.findMany>> = [];

  if (automation.triggerType === "NEW_CONTACT") {
    contacts = await prisma.contact.findMany({
      where: automation.lastRunAt ? { createdAt: { gt: automation.lastRunAt } } : {},
    });
  } else if (automation.triggerType === "TAG_ADDED") {
    const tag = triggerConfig.tag as string | undefined;
    contacts = tag ? await prisma.contact.findMany({ where: { tags: { has: tag } } }) : [];
  } else if (automation.triggerType === "NO_REPLY_DAYS") {
    const days = Number(triggerConfig.days) || 3;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const all = await prisma.contact.findMany({
      include: { interactions: { orderBy: { occurredAt: "desc" }, take: 1 } },
    });
    contacts = all.filter((c) => {
      const last = c.interactions[0];
      return last && last.direction === "OUTBOUND" && last.occurredAt < cutoff;
    });
  } else {
    // MANUAL: optionally scoped to a tag, otherwise applies to every contact.
    const tag = triggerConfig.tag as string | undefined;
    contacts = tag
      ? await prisma.contact.findMany({ where: { tags: { has: tag } } })
      : await prisma.contact.findMany();
  }

  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    try {
      if (automation.actionType === "ADD_TAG") {
        const tag = actionConfig.tag as string | undefined;
        if (tag && !contact.tags.includes(tag)) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { tags: { push: tag } },
          });
          applied++;
        } else {
          skipped++;
        }
      } else if (automation.actionType === "LOG_NOTE") {
        const note = (actionConfig.note as string) || "Automation ran.";
        await prisma.interaction.create({
          data: {
            contactId: contact.id,
            type: "NOTE",
            direction: "OUTBOUND",
            body: fillTemplate(note, contact),
          },
        });
        applied++;
      } else if (automation.actionType === "SEND_EMAIL") {
        if (!contact.email || !automation.createdById) {
          skipped++;
          continue;
        }
        const gmail = await prisma.gmailConnection.findUnique({
          where: { userId: automation.createdById },
        });
        if (!gmail) {
          skipped++;
          continue;
        }
        const subject = fillTemplate((actionConfig.subject as string) || "", contact);
        const emailBody = fillTemplate((actionConfig.body as string) || "", contact);
        const externalId = await sendGmail(automation.createdById, contact.email, subject, emailBody);
        await prisma.interaction.create({
          data: {
            contactId: contact.id,
            userId: automation.createdById,
            type: "EMAIL",
            direction: "OUTBOUND",
            subject,
            body: emailBody,
            toAddress: contact.email,
            externalId,
          },
        });
        applied++;
      }
    } catch (err) {
      errors.push(`${contact.contactName}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  await prisma.automation.update({ where: { id: automationId }, data: { lastRunAt: new Date() } });

  return { matched: contacts.length, applied, skipped, errors };
}
