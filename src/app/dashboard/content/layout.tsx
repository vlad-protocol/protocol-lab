import { requireAccess } from "@/lib/require-access";

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requireAccess("content");
  return <>{children}</>;
}
