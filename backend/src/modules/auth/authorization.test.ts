import { describe, expect, it } from "vitest";

import { canAssignRole, canManageRole, hasMinimumRole } from "./authorization.js";

describe("authorization helpers", () => {
  it("allows higher roles to satisfy lower minimum roles", () => {
    expect(hasMinimumRole("admin", "operator")).toBe(true);
    expect(hasMinimumRole("management", "operator")).toBe(true);
    expect(hasMinimumRole("operator", "management")).toBe(false);
  });

  it("limits management to operator user management", () => {
    expect(canManageRole("management", "operator")).toBe(true);
    expect(canManageRole("management", "management")).toBe(false);
    expect(canManageRole("management", "admin")).toBe(false);
  });

  it("only lets admin assign admin or management roles", () => {
    expect(canAssignRole("admin", "admin")).toBe(true);
    expect(canAssignRole("admin", "management")).toBe(true);
    expect(canAssignRole("management", "operator")).toBe(true);
    expect(canAssignRole("management", "management")).toBe(false);
  });
});