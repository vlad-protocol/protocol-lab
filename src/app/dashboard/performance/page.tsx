import { redirect } from "next/navigation";
import { getSession as auth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import { isInstagramConfigured } from "@/lib/integrations/instagram";
import { PerformanceShell } from "./performance-shell";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canAccess(session.user, "content_performance")) redirect("/dashboard");

  const [events, posts, instagram, zeffy] = await Promise.all([
    prisma.marketingEvent.findMany({
      include: { posts: { select: { id: true, caption: true, thumbnailUrl: true, contentCategory: true } } },
      orderBy: { eventDate: "desc" },
    }),
    prisma.instagramPost.findMany({
      include: { events: { select: { id: true, name: true } } },
      orderBy: { postedAt: "desc" },
      take: 100,
    }),
    prisma.instagramConnection.findFirst({ orderBy: { connectedAt: "desc" } }),
    prisma.zeffyConnection.findFirst({ orderBy: { connectedAt: "desc" } }),
  ]);

  return (
    <PerformanceShell
      initialEvents={JSON.parse(JSON.stringify(events))}
      initialPosts={JSON.parse(JSON.stringify(posts))}
      instagramConnected={!!instagram}
      instagramConfigured={isInstagramConfigured()}
      zeffyConnected={!!zeffy}
    />
  );
}
