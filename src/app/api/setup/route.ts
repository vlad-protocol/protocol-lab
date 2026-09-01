import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// This HQ is built for a single owner. The very first person to hit
// /setup gets to create the one admin account; after that this route
// always refuses, so nobody else can register themselves in later.

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ setupComplete: count > 0 });
}

export async function POST(req: Request) {
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json(
      { error: "Setup already completed. This HQ already has an owner account." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { email, password, name } = body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, passwordHash, name: name || null },
  });

  return NextResponse.json({ ok: true });
}
