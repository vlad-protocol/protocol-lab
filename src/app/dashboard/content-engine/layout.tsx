import { requireAccess } from "@/lib/require-access";

export default async function ContentEngineLayout({ children }: { children: React.ReactNode }) {
  await requireAccess("content_engine");
  return <>{children}</>;
}
