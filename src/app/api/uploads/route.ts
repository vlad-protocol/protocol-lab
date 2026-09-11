import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { publicBaseUrl } from "@/lib/http";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — plenty for an email-embedded image, keeps the DB row small
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

// Stores an uploaded image as bytes in the database and returns the
// public URL it will be served back at — that URL is what gets pasted
// into an image block's "Image URL" field. Public (no auth on the GET
// side) is required since recipients' email clients load it directly,
// with no way to authenticate.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "campaigns")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, GIF, or WebP images are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Image is too large — max ${MAX_BYTES / 1024 / 1024}MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const image = await prisma.uploadedImage.create({
    data: {
      data: buffer,
      contentType: file.type,
      filename: file.name || null,
      size: buffer.length,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ id: image.id, url: `${publicBaseUrl(req)}/api/uploads/${image.id}` });
}
