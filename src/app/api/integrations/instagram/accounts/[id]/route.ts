import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { disconnectInstagramAccount } from "@/lib/integrations/instagram";

// Disconnects ONE account — unlike the old /status DELETE, this never
// touches the others. Posts already synced from this account (and any
// ContentPost rows targeting it) just keep their now-dangling
// instagramConnectionId set to null (onDelete: SetNull in the schema)
// rather than being deleted themselves.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await disconnectInstagramAccount(id);
  return NextResponse.json({ ok: true });
}
