import { prisma } from "@/lib/prisma";

// Shared by every "send an email that should show up in the CRM" path
// (general compose, reply, forward) — finds the contact this address
// already belongs to, or creates a new lead so the send/reply still gets
// logged against someone.
export async function findOrCreateContactByEmail(email: string, createdById: string) {
  const existing = await prisma.contact.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) return existing.id;

  const created = await prisma.contact.create({
    data: {
      contactName: email.split("@")[0],
      email,
      createdById,
    },
  });
  return created.id;
}
