import { Handshake } from "lucide-react";
import { requireAccess } from "@/lib/require-access";
import { getOrSeedProtocolLeads } from "@/lib/protocol-crm-server";
import { ProtocolCRMView } from "./protocol-crm-view";

export const dynamic = "force-dynamic";

export default async function ProtocolCRMPage() {
  await requireAccess("protocol_crm");

  const leads = await getOrSeedProtocolLeads();

  return (
    <div className="max-w-7xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <Handshake className="h-6 w-6 text-[var(--hq-accent)]" />
          Protocol CRM
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Sponsor and venue partnership pipeline for Protocol — one row per company, shared with the whole team.
          Click any cell to update it as you go.
        </p>
      </div>

      <div className="mt-6">
        <ProtocolCRMView
          initialLeads={leads.map((l) => ({
            ...l,
            dateFirstContacted: l.dateFirstContacted ? l.dateFirstContacted.toISOString() : null,
            lastContactDate: l.lastContactDate ? l.lastContactDate.toISOString() : null,
            nextFollowUpDate: l.nextFollowUpDate ? l.nextFollowUpDate.toISOString() : null,
          }))}
        />
      </div>
    </div>
  );
}
