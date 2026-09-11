import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { isDateLike, normalizePhoneDisplay } from "@/lib/phone-format";

const CHUNK_SIZE = 200;

// One-time cleanup for data imported before the date/phone mixup in
// protocol-list-import.ts was fixed: a signup-date column with no
// recognized header (e.g. "23-07-2026") used to get backfilled straight
// into the phone field, since a bare date is also all digits/dashes with
// 7+ digits once punctuation is stripped. This walks every existing
// member, blanks out anything that's actually a date, and reformats
// every real phone number into one consistent (XXX) XXX-XXXX shape
// instead of whatever punctuation the original source file used.
export async function POST() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_list")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.protocolListMember.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });

  let cleared = 0;
  let reformatted = 0;
  const updates: { id: string; phone: string | null }[] = [];

  for (const m of members) {
    const phone = m.phone as string;
    if (isDateLike(phone)) {
      updates.push({ id: m.id, phone: null });
      cleared++;
      continue;
    }
    const next = normalizePhoneDisplay(phone);
    if (next !== phone) {
      updates.push({ id: m.id, phone: next });
      reformatted++;
    }
  }

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map((u) => prisma.protocolListMember.update({ where: { id: u.id }, data: { phone: u.phone } }))
    );
  }

  return NextResponse.json({ scanned: members.length, cleared, reformatted });
}
