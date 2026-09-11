import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { publicBaseUrl } from "@/lib/http";

// Logo upload for a personal email signature — self-service like the
// rest of the email-signature feature (no extra permission beyond being
// signed in). Reuses the same UploadedImage store as campaign images
// (see /api/uploads): bytes in the DB, served back publicly at
// /api/uploads/[id] since a recipient's mail client has to be able to
// load it with no session of any kind.
const MAX_BYTES = 2 * 1024 * 1024; // a signature logo is small — 2MB is generous
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, GIF, or WebP images are supported." }, { status: 400 });
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

  const logoUrl = `${publicBaseUrl(req)}/api/uploads/${image.id}`;

  // Save it straight onto the user's signature too — the caller doesn't
  // have to make a second PATCH request just to point signatureLogoUrl
  // at what was just uploaded.
  await prisma.user.update({ where: { id: session.user.id }, data: { signatureLogoUrl: logoUrl } });

  return NextResponse.json({ url: logoUrl });
}
