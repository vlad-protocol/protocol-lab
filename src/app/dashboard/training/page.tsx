import { requireAccess } from "@/lib/require-access";
import { prisma } from "@/lib/prisma";
import { TrainingLedger } from "./ledger";

export const dynamic = "force-dynamic";

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function TrainingPage() {
  const session = await requireAccess("training");

  const weekOf = mondayOf(new Date());
  const checkIns = await prisma.trainingCheckIn.findMany({
    where: { userId: session.user.id, weekOf },
  });

  return (
    <TrainingLedger
      weekOf={weekOf.toISOString()}
      initialDone={checkIns.map((c) => c.dayKey)}
    />
  );
}
