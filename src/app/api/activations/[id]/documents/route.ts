import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { seedRowsFor, type SopDocType } from "@/lib/sop-templates";

const VALID_TYPES = ["PROPOSAL", "CONTRACT", "ATTENDEE", "RUNOFSHOW", "ROSTER", "SURVEY", "REPORT"];

function toTemplateKey(type: string): SopDocType {
  return type.toLowerCase() as SopDocType;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const documents = await prisma.sopDocument.findMany({ where: { activationId: id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ documents });
}

// Creates a new document of the given type, seeded with that template's
// default row groups (e.g. the run-of-show's two seeded tables) so the
// editor opens with something to edit rather than a blank table.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "activations")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const activation = await prisma.activation.findUnique({ where: { id } });
  if (!activation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = (await req.json()) as { type?: string; name?: string };
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "A valid document type is required." }, { status: 400 });
  }

  const doc = await prisma.sopDocument.create({
    data: {
      activationId: id,
      type: body.type as never,
      name: body.name || "Untitled",
      fields: {},
      rows: seedRowsFor(toTemplateKey(body.type)) as object,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ document: doc });
}
