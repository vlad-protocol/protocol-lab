// Every module an employee's access can be scoped to. The owner account
// always has every module; these keys only ever restrict EMPLOYEE users.

export const MODULES = [
  { key: "content", label: "Trial Reels" },
  { key: "analytics", label: "Analytics" },
  { key: "people", label: "People (CRM)" },
  { key: "mail", label: "Mail" },
  { key: "comms", label: "Comms (texts)" },
  { key: "automations", label: "Automations" },
  { key: "training", label: "Training" },
  { key: "team", label: "Team & permissions (admin-only in practice)" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export type SessionUserLike = {
  role: "OWNER" | "EMPLOYEE";
  permissions: string[];
};

export function canAccess(user: SessionUserLike | null | undefined, module: ModuleKey): boolean {
  if (!user) return false;
  if (user.role === "OWNER") return true;
  return user.permissions.includes(module);
}
