import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { syncInstagramContent, syncZeffySales } from "@/lib/content-performance";

// Manual "sync now" — mirrors the Automation Confirmations "run now"
// pattern, so you don't have to wait for the next background tick after
// connecting an account or posting something new.
export async function POST() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [instagram, zeffy] = await Promise.allSettled([syncInstagramContent(), syncZeffySales()]);
  return NextResponse.json({
    instagram: instagram.status === "fulfilled" ? instagram.value : { error: instagram.reason?.message },
    zeffy: zeffy.status === "fulfilled" ? zeffy.value : { error: zeffy.reason?.message },
  });
}
