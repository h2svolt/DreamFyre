export type Role = "player" | "support" | "game_ops" | "finance" | "admin" | "super_admin";

export const STAFF_ROLES: Role[] = ["support", "game_ops", "finance", "admin", "super_admin"];
export const ASSIGNABLE_STAFF_ROLES: Role[] = ["support", "game_ops", "finance", "admin"];

export type Action =
  | "view_staff_portal"
  | "process_game_requests"
  | "process_withdrawals"
  | "manage_staff"
  | "manage_users"
  | "manage_verification"
  | "manage_payments"
  | "manage_content"
  | "manage_support"
  | "manage_platform"
  | "view_audit_log";

const MATRIX: Record<Action, Role[]> = {
  view_staff_portal: ["support", "game_ops", "finance", "admin", "super_admin"],
  process_game_requests: ["game_ops", "admin", "super_admin"],
  process_withdrawals: ["finance", "admin", "super_admin"],
  manage_staff: ["super_admin"],
  manage_users: ["admin", "super_admin"],
  manage_verification: ["admin", "super_admin"],
  manage_payments: ["finance", "admin", "super_admin"],
  manage_content: ["admin", "super_admin"],
  manage_support: ["support", "admin", "super_admin"],
  manage_platform: ["super_admin"],
  view_audit_log: ["admin", "super_admin"],
};

export function isStaffRole(role: string): role is Role {
  return (STAFF_ROLES as string[]).includes(role);
}

export function hasPermission(role: string, action: Action): boolean {
  return MATRIX[action].includes(role as Role);
}

export function isValidRole(role: string): role is Role {
  return role === "player" || isStaffRole(role);
}
