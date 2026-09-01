import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Use this instead of auth() directly in Server Components and API routes
// (never in middleware — this hits the database, and middleware runs on
// the Edge runtime where Prisma can't run). It re-reads role/permissions
// from the DB on every call, so when the owner changes what an employee
// can see, it takes effect on their very next request — not their next
// login, which is how long the JWT's baked-in copy would otherwise last.
export async function getSession() {
  const session = await auth();
  if (!session?.user) return session;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, permissions: true },
  });
  if (dbUser) {
    session.user.role = dbUser.role;
    session.user.permissions = dbUser.permissions;
  }
  return session;
}
