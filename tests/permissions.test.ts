import { describe, it, expect } from "vitest";

import { roleAtLeast, roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";

describe("roleAtLeast", () => {
  it("orders roles author < editor < admin < super_admin", () => {
    expect(roleAtLeast("author", "author")).toBe(true);
    expect(roleAtLeast("author", "editor")).toBe(false);
    expect(roleAtLeast("editor", "author")).toBe(true);
    expect(roleAtLeast("admin", "editor")).toBe(true);
    expect(roleAtLeast("super_admin", "admin")).toBe(true);
    expect(roleAtLeast("admin", "super_admin")).toBe(false);
  });

  it("is false for a signed-out user (null role)", () => {
    expect(roleAtLeast(null, "author")).toBe(false);
  });
});

describe("roleHasPermission", () => {
  it("super_admin implicitly has every permission", () => {
    expect(roleHasPermission("super_admin", PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(roleHasPermission("super_admin", PERMISSIONS.ADS_MANAGE)).toBe(true);
  });

  it("author cannot publish or manage users", () => {
    expect(roleHasPermission("author", PERMISSIONS.POSTS_PUBLISH)).toBe(false);
    expect(roleHasPermission("author", PERMISSIONS.USERS_MANAGE)).toBe(false);
  });

  it("author can create and edit their own posts", () => {
    expect(roleHasPermission("author", PERMISSIONS.POSTS_CREATE)).toBe(true);
    expect(roleHasPermission("author", PERMISSIONS.POSTS_EDIT_OWN)).toBe(true);
  });

  it("editor can publish but not manage users or settings", () => {
    expect(roleHasPermission("editor", PERMISSIONS.POSTS_PUBLISH)).toBe(true);
    expect(roleHasPermission("editor", PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(roleHasPermission("editor", PERMISSIONS.SETTINGS_MANAGE)).toBe(false);
  });

  it("admin has settings and user management", () => {
    expect(roleHasPermission("admin", PERMISSIONS.SETTINGS_MANAGE)).toBe(true);
    expect(roleHasPermission("admin", PERMISSIONS.USERS_MANAGE)).toBe(true);
  });
});
