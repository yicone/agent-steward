import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";

import { createPlatformPaths } from "../src/lib/server/platform";

describe("createPlatformPaths", () => {
  describe("darwin", () => {
    it("returns macOS Application Support paths", () => {
      const home = os.homedir();
      const p = createPlatformPaths("darwin");

      expect(p.antigravityLogsRoot()).toBe(
        path.join(home, "Library", "Application Support", "Antigravity", "logs")
      );
      expect(p.windsurfLogsRoot()).toBe(
        path.join(home, "Library", "Application Support", "Windsurf", "logs")
      );
      expect(p.antigravityVscdbPath()).toBe(
        path.join(home, "Library", "Application Support", "Antigravity", "User", "globalStorage", "state.vscdb")
      );
    });
  });

  describe("win32", () => {
    it("uses APPDATA when set", () => {
      const p = createPlatformPaths("win32", { APPDATA: "/mock/AppData/Roaming" });

      expect(p.antigravityLogsRoot()).toBe(
        path.join("/mock/AppData/Roaming", "Antigravity", "logs")
      );
      expect(p.windsurfLogsRoot()).toBe(
        path.join("/mock/AppData/Roaming", "Windsurf", "logs")
      );
      expect(p.antigravityVscdbPath()).toBe(
        path.join("/mock/AppData/Roaming", "Antigravity", "User", "globalStorage", "state.vscdb")
      );
    });

    it("falls back to homedir/AppData/Roaming when APPDATA is unset", () => {
      const home = os.homedir();
      const p = createPlatformPaths("win32", { APPDATA: undefined });
      const expected = path.join(home, "AppData", "Roaming");

      expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
      expect(p.windsurfLogsRoot()).toBe(path.join(expected, "Windsurf", "logs"));
    });

    it("treats empty APPDATA as unset", () => {
      const home = os.homedir();
      const p = createPlatformPaths("win32", { APPDATA: "" });
      const expected = path.join(home, "AppData", "Roaming");

      expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
    });

    it("treats whitespace-only APPDATA as unset", () => {
      const home = os.homedir();
      const p = createPlatformPaths("win32", { APPDATA: "   " });
      const expected = path.join(home, "AppData", "Roaming");

      expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
    });
  });

  describe("linux", () => {
    it("uses XDG_CONFIG_HOME when set", () => {
      const p = createPlatformPaths("linux", { XDG_CONFIG_HOME: "/mock/.config" });

      expect(p.antigravityLogsRoot()).toBe(
        path.join("/mock/.config", "Antigravity", "logs")
      );
      expect(p.windsurfLogsRoot()).toBe(
        path.join("/mock/.config", "Windsurf", "logs")
      );
      expect(p.antigravityVscdbPath()).toBe(
        path.join("/mock/.config", "Antigravity", "User", "globalStorage", "state.vscdb")
      );
    });

    it("falls back to homedir/.config when XDG_CONFIG_HOME is unset", () => {
      const home = os.homedir();
      const p = createPlatformPaths("linux", { XDG_CONFIG_HOME: undefined });
      const expected = path.join(home, ".config");

      expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
      expect(p.windsurfLogsRoot()).toBe(path.join(expected, "Windsurf", "logs"));
    });

    it("treats empty XDG_CONFIG_HOME as unset", () => {
      const home = os.homedir();
      const p = createPlatformPaths("linux", { XDG_CONFIG_HOME: "" });
      const expected = path.join(home, ".config");

      expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
    });

    it("treats whitespace-only XDG_CONFIG_HOME as unset", () => {
      const home = os.homedir();
      const p = createPlatformPaths("linux", { XDG_CONFIG_HOME: "   " });
      const expected = path.join(home, ".config");

      expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
    });
  });

  describe("unsupported platform", () => {
    it("falls back to linux-style paths for unhandled platform values", () => {
      const p = createPlatformPaths("freebsd" as NodeJS.Platform, { XDG_CONFIG_HOME: "/xdg" });

      expect(p.antigravityLogsRoot()).toBe(path.join("/xdg", "Antigravity", "logs"));
    });
  });

  describe("PlatformPaths interface contract", () => {
    it("all methods return non-empty strings", () => {
      for (const platform of ["darwin", "win32", "linux"] as const) {
        const p = createPlatformPaths(platform);
        expect(p.antigravityLogsRoot().length).toBeGreaterThan(0);
        expect(p.windsurfLogsRoot().length).toBeGreaterThan(0);
        expect(p.antigravityVscdbPath().length).toBeGreaterThan(0);
      }
    });

    it("vscdb path ends with state.vscdb on all platforms", () => {
      for (const platform of ["darwin", "win32", "linux"] as const) {
        const p = createPlatformPaths(platform);
        expect(p.antigravityVscdbPath()).toMatch(/state\.vscdb$/);
      }
    });

    it("sqlite3Binary returns a path on darwin and linux, null on win32", () => {
      expect(createPlatformPaths("darwin").sqlite3Binary()).toBe("/usr/bin/sqlite3");
      expect(createPlatformPaths("linux").sqlite3Binary()).toBe("/usr/bin/sqlite3");
      expect(createPlatformPaths("win32").sqlite3Binary()).toBeNull();
    });
  });
});
