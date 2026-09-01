import { requireAccess } from "@/lib/require-access";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireAccess("analytics");
  return <>{children}</>;
}
