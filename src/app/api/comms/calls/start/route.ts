import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { startRecordedCall } from "@/lib/integrations/twilio";

// Click-to-call: rings the rep's own phone first, then bridges to the
// contact once they pick up, recording from the moment the bridge
// connects. See the legal note in lib/integrations/twilio.ts — recording
// consent rules vary by location, so confirm what applies to you.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "people")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { contactId, contactPhone, repPhone } = body as {
    contactId?: string;
    contactPhone?: string;
    repPhone?: string;
  };

  if (!contactId || !contactPhone || !repPhone) {
    return NextResponse.json(
      { error: "contactId, contactPhone, and repPhone are required." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "PUBLIC_APP_URL isn't set — Twilio needs a public URL to call back for the call flow." },
      { status: 500 }
    );
  }

  let callSid: string;
  try {
    callSid = await startRecordedCall(repPhone, contactPhone, baseUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start the call." },
      { status: 409 }
    );
  }

  const interaction = await prisma.interaction.create({
    data: {
      contactId,
      userId: session.user.id,
      type: "CALL",
      direction: "OUTBOUND",
      phoneNumber: contactPhone,
      externalId: callSid,
      body: "Call in progress…",
    },
  });

  return NextResponse.json({ interaction, callSid });
}
