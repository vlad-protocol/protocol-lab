import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { enrollContact } from "@/lib/sequences";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const { sequenceId } = body as { sequenceId?: string };
  if (!sequenceId) {
    return NextResponse.json({ error: "sequenceId is required." }, { status: 400 });
  }

  try {
    const enrollment = await enrollContact(id, sequenceId);
    return NextResponse.json({ enrollment });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to enroll this contact." },
      { status: 400 }
    );
  }
}
