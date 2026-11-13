/**
 * Every admin entry point checks the owner (Phase 5 D2). Static check: each exported server
 * action in src/actions/admin and each admin page starts with requireAdmin()/adminActor().
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");

function files(dir: string, match: (f: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, match);
    return match(name) ? [path] : [];
  });
}

const guard = /^\s*(await requireAdmin\(\)|const \w+ = await (requireAdmin|adminActor)\(\))/m;

/** Body of each `export async function` up to its first statement. */
function exportedFunctions(source: string) {
  const out: { name: string; firstLine: string }[] = [];
  const re = /export async function (\w+)\([^]*?\)[^{]*\{\n([^\n]*)/g;
  for (const m of source.matchAll(re)) out.push({ name: m[1], firstLine: m[2] });
  return out;
}

describe("admin server actions", () => {
  const actionFiles = files(join(root, "actions", "admin"), (f) => f.endsWith(".ts")).filter(
    (f) => !f.endsWith("session.ts"),
  );
  it("finds the action files", () => expect(actionFiles.length).toBeGreaterThan(0));
  for (const file of actionFiles) {
    const source = readFileSync(file, "utf8");
    for (const fn of exportedFunctions(source)) {
      it(`${file.split("/actions/")[1]} ${fn.name} checks the owner first`, () => {
        expect(fn.firstLine).toMatch(guard);
      });
    }
  }
});

describe("admin pages", () => {
  const pages = files(
    join(root, "app", "admin"),
    (f) => f === "page.tsx" || f === "route.ts",
  ).filter((f) => !f.includes("/login/"));
  for (const file of pages) {
    it(`${file.split("/app/")[1]} calls requireAdmin()`, () => {
      expect(readFileSync(file, "utf8")).toMatch(/await requireAdmin\(\)/);
    });
  }
});

describe("admin queries", () => {
  const source = readFileSync(join(root, "lib", "admin", "queries.ts"), "utf8");
  for (const fn of exportedFunctions(source)) {
    it(`queries.${fn.name} checks the owner first`, () => expect(fn.firstLine).toMatch(guard));
  }
});

describe("account server actions and pages", () => {
  const customerGuard = /await (requireCustomer|getCustomer)\(/;
  const actions = files(join(root, "actions", "account"), (f) => f.endsWith(".ts")).filter(
    (f) => !f.endsWith("auth.ts"),
  );
  for (const file of actions) {
    const source = readFileSync(file, "utf8");
    for (const fn of exportedFunctions(source)) {
      it(`${file.split("/actions/")[1]} ${fn.name} checks the customer first`, () => {
        expect(fn.firstLine).toMatch(/^\s*const \w+ = await requireCustomer\(/);
      });
    }
  }
  const pages = files(join(root, "app", "(shop)", "account"), (f) => f === "page.tsx");
  it("finds the account pages", () => expect(pages.length).toBeGreaterThan(0));
  for (const file of pages) {
    it(`${file.split("/app/")[1]} reads the customer`, () => {
      expect(readFileSync(file, "utf8")).toMatch(customerGuard);
    });
  }
  it("account queries check the customer first", () => {
    const source = readFileSync(join(root, "lib", "account", "queries.ts"), "utf8");
    for (const fn of exportedFunctions(source)) {
      expect(fn.firstLine, fn.name).toMatch(/^\s*const \w+ = await requireCustomer\(/);
    }
  });
});
