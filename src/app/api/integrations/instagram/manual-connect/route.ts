import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { connectInstagramManually } from "@/lib/integrations/instagram";

// Manual-token connect: pastes a System User Access Token generated
// directly in Meta's dashboard (Unified Login's "Generate access tokens"
// step), instead of the classic OAuth redirect in ../connect, which Meta
// no longer supports for apps created after their Unified Login rollout.
// Each call adds (or, for an already-connected account, refreshes) one
// account — see connectInstagramManually's igUserId-based upsert.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { igUserId, accessToken, label } = body as { igUserId?: string; accessToken?: string; label?: string };
  if (!igUserId?.trim() || !accessToken?.trim()) {
    return NextResponse.json({ error: "Both the account ID and the access token are required." }, { status: 400 });
  }

  try {
    const conn = await connectInstagramManually({
      igUserId: igUserId.trim(),
      accessToken: accessToken.trim(),
      label: label?.trim() || undefined,
    });
    return NextResponse.json({ ok: true, account: { id: conn.id, username: conn.username, label: conn.label } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't verify that token." },
      { status: 400 }
    );
  }
}
