import { redirect } from "next/navigation";
import { getSession as auth } from "@/lib/session";
import { canAccess, type ModuleKey } from "@/lib/permissions";

// Server-side guard for a module page. The sidebar already hides links an
// employee can't use, but that's just UI — this is what actually stops
// someone from opening the URL directly. Call it at the top of every
// permissioned page's Server Component.
export async function requireAccess(module: ModuleKey) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canAccess(session.user, module)) {
    redirect("/dashboard?denied=" + module);
  }
  return session;
}
