import { Anton, Inter, JetBrains_Mono, Permanent_Marker } from "next/font/google";
import { requireAccess } from "@/lib/require-access";
import { Deck } from "./deck";

// The client-facing deck, full screen with no app chrome, so it can be
// screen-shared as-is. Still behind login (it's shown from Vlad's own
// browser during the call), and it re-reads the live proposal every few
// seconds, so it can sit open in a tab and fill itself while the call runs.
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--deck-head" });
const inter = Inter({ subsets: ["latin"], variable: "--deck-body" });
const mono = JetBrains_Mono({ weight: ["500", "700"], subsets: ["latin"], variable: "--deck-mono" });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--deck-brush" });

export const dynamic = "force-dynamic";

export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("live_proposal");
  const { id } = await params;
  return (
    <div className={`${anton.variable} ${inter.variable} ${mono.variable} ${marker.variable}`}>
      <Deck id={id} />
    </div>
  );
}
