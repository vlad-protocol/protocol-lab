import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}

// Owner invites a teammate. Since there's no email-sending system wired up
// for transactional mail yet, this generates a one-time temporary password
// the owner shares with them directly (Slack, text, in person) — simplest
// thing that actually works without another paid service.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, name, permissions } = body as {
    email?: string;
    name?: string;
    permissions?: string[];
  };

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
  }

  const tempPassword = crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash,
      role: "EMPLOYEE",
      permissions: permissions || [],
      invitedById: session.user.id,
    },
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    tempPassword,
  });
}
