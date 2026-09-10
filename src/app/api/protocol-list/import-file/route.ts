import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { parseContactsFile } from "@/lib/protocol-list-import";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

// Imports Protocol List members from an uploaded CSV or Excel (.xlsx/.xls)
// file. Recognizes common "name"/"email"/"phone" column headers (a few
// synonyms each, case-insensitive); falls back to classifying each cell by
// shape when headers aren't recognized or are missing entirely. Existing
// rows aren't checked for duplicates here — like the bulk-paste importer,
// this is a straight append.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "protocol_list")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Attach a CSV or Excel file." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 10MB)." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return NextResponse.json({ error: "Only .csv, .xlsx, or .xls files are supported." }, { status: 400 });
  }

  let rows: { name: string | null; email: string | null; phone: string | null }[];
  let skipped: number;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseContactsFile(buffer);
    rows = parsed.rows;
    skipped = parsed.skipped;
  } catch {
    return NextResponse.json({ error: "Couldn't read that file — make sure it's a valid CSV or Excel file." }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows with an email or phone number were found in that file." }, { status: 400 });
  }

  await prisma.protocolListMember.createMany({
    data: rows.map((r) => ({ ...r, source: "MANUAL" as const, createdById: session.user.id })),
  });

  return NextResponse.json({ added: rows.length, skipped });
}
