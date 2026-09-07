import { prisma } from "@/lib/prisma";
import { PROTOCOL_LEAD_SEED } from "@/lib/protocol-lead-seed";

// Shared by the Protocol CRM page — seeds the pipeline once, the first time
// anyone opens it, from the real sponsor/venue tracker Vlad and the team
// were already running in Google Sheets. Never re-seeds once there's at
// least one lead, so it's safe to call on every page load.
export async function getOrSeedProtocolLeads() {
  const count = await prisma.protocolLead.count();
  if (count === 0) {
    await prisma.protocolLead.createMany({
      data: PROTOCOL_LEAD_SEED,
    });
  }
  return prisma.protocolLead.findMany({ orderBy: { number: "asc" } });
}
