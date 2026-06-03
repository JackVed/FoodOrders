import type { UserRole } from "./session.js";

const rolePriority: Record<UserRole, number> = {
  operator: 0,
  management: 1,
  admin: 2,
};

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole) {
  return rolePriority[userRole] >= rolePriority[minimumRole];
}

export function canManageRole(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === "admin") {
    return true;
  }

  return actorRole === "management" && targetRole === "operator";
}

export function canAssignRole(actorRole: UserRole, targetRole: UserRole) {
  return canManageRole(actorRole, targetRole);
}