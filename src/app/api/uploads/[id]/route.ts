import { prisma } from "@/lib/prisma";

// Deliberately public/no-auth — this is what an <img src> in a sent
// campaign email points at, and the recipient's mail client fetches it
// with no session of any kind.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await prisma.uploadedImage.findUnique({ where: { id } });
  if (!image) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(image.data), {
    status: 200,
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(image.size),
    },
  });
}
