import { prisma } from "@/lib/prisma";
import { sendGmail } from "@/lib/integrations/gmail";

function fillTemplate(text: string, contact: { contactName: string; companyName: string | null }) {
  return text
    .replaceAll("{{contactName}}", contact.contactName)
    .replaceAll("{{companyName}}", contact.companyName || "");
}

// Runs on demand (the "Run now" button) rather than on a background
// schedule — Railway doesn't run cron jobs for you by default, so this is
// the honest version of "automated" until a real scheduler is wired up
// (a Railway cron service hitting this same endpoint would do it).
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
