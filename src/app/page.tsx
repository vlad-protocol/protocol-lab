import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession as auth } from "@/lib/session";

// This page always checks the database, so it can't be statically
// prerendered at build time (there's no DB available during the build).
export const dynamic = "force-dynamic";

export default async function Home() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  const session = await auth();
  redirect(session ? "/dashboard" : "/login");
}
