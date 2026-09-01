import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await prisma.twilioConnection.findFirst({ orderBy: { connectedAt: "desc" } });
  return NextResponse.json({
    connected: !!conn,
    phoneNumber: conn?.phoneNumber || null,
  });
}

// Owner-only: this is the one shared business phone number, not a
// per-employee credential.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accountSid, authToken, phoneNumber } = body as {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
  };

  if (!accountSid || !authToken || !phoneNumber) {
    return NextResponse.json(
      { error: "accountSid, authToken, and phoneNumber are all required." },
      { status: 400 }
    );
  }

  // Only one Twilio line for the whole HQ — replace any existing config.
  await prisma.twilioConnection.deleteMany({});
  await prisma.twilioConnection.create({
    data: { accountSid, authToken: encryptSecret(authToken), phoneNumber },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.twilioConnection.deleteMany({});
  return NextResponse.json({ ok: true });
}
