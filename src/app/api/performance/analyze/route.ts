import { NextResponse } from "next/server";
import { getSession as auth } from "@/lib/session";
import { canAccess } from "@/lib/permissions";
import { generatePerformanceAssessment } from "@/lib/content-performance";

export async function POST() {
  const session = await auth();
  if (!session?.user || !canAccess(session.user, "content_performance")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const assessment = await generatePerformanceAssessment();
    return NextResponse.json({ assessment });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Analysis failed." }, { status: 502 });
  }
}
