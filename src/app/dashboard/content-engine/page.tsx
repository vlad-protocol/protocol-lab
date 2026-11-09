import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { isInstagramConfigured } from "@/lib/integrations/instagram";
import { isContentEngineAiConfigured } from "@/lib/content-engine";
import { ContentEngineShell } from "./content-engine-shell";

export const dynamic = "force-dynamic";

export default async function ContentEnginePage() {
  await requireAccess("content_engine");

  const [ideas, scripts, posts, carousels, instagramAccounts] = await Promise.all([
    prisma.contentIdea.findMany({
      include: { scripts: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contentScript.findMany({
      include: {
        idea: { select: { id: true, title: true } },
        posts: { select: { id: true, status: true, scheduledFor: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contentPost.findMany({
      include: {
        script: { select: { id: true, title: true, hook: true } },
        instagramPost: { select: { id: true, permalink: true, thumbnailUrl: true, views: true, likes: true } },
        instagramConnection: { select: { id: true, username: true, label: true } },
      },
      orderBy: { scheduledFor: "asc" },
    }),
    prisma.contentCarousel.findMany({
      include: {
        slides: { orderBy: { position: "asc" } },
        sourcePost: { select: { id: true, permalink: true, caption: true, thumbnailUrl: true, views: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.instagramConnection.findMany({
      orderBy: { connectedAt: "desc" },
      select: { id: true, igUserId: true, username: true, label: true },
    }),
  ]);

  // Candidate posts to repurpose: your own synced Reels, best performers first.
  const topPosts = await prisma.instagramPost.findMany({
    where: { views: { not: null } },
    orderBy: { views: "desc" },
    take: 20,
    select: { id: true, permalink: true, caption: true, thumbnailUrl: true, views: true, likes: true, comments: true, shares: true },
  });

  return (
    <div className="max-w-6xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--hq-text)]">
          <Sparkles className="h-6 w-6 text-[var(--hq-accent)]" />
          Content Engine
        </h1>
        <p className="mt-1 text-sm text-[var(--hq-text-muted)]">
          Swipe ideas worth stealing from, draft scripts with Claude, see a pre-post score before you film,
          schedule to the calendar, and spin winners into new angles and carousels.
        </p>
      </div>

      <div className="mt-6">
        <ContentEngineShell
          initialIdeas={JSON.parse(JSON.stringify(ideas))}
          initialScripts={JSON.parse(JSON.stringify(scripts))}
          initialPosts={JSON.parse(JSON.stringify(posts))}
          initialCarousels={JSON.parse(JSON.stringify(carousels))}
          topPosts={JSON.parse(JSON.stringify(topPosts))}
          instagramAccounts={JSON.parse(JSON.stringify(instagramAccounts))}
          instagramConfigured={isInstagramConfigured()}
          aiConfigured={isContentEngineAiConfigured()}
        />
      </div>
    </div>
  );
}
