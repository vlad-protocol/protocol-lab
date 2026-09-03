import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "booking")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requests = await prisma.bookingRequest.findMany({ orderBy: { requestedAt: "asc" } });
  return NextResponse.json({ requests });
}

// Intentionally public — this is how someone outside the team books time.
export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, phone, message, requestedAt } = body as {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    requestedAt?: string;
  };
  if (!name || !email || !requestedAt) {
    return NextResponse.json({ error: "name, email, and requestedAt are required." }, { status: 400 });
  }
  const request = await prisma.bookingRequest.create({
    data: {
      name,
      email,
      phone: phone || null,
      message: message || null,
      requestedAt: new Date(requestedAt),
    },
  });
  return NextResponse.json({ request });
}
