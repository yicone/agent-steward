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
      const prev = process.env.APPDATA;
      try {
        process.env.APPDATA = "/mock/AppData/Roaming";
        const p = createPlatformPaths("win32");

        expect(p.antigravityLogsRoot()).toBe(
          path.join("/mock/AppData/Roaming", "Antigravity", "logs")
        );
        expect(p.windsurfLogsRoot()).toBe(
          path.join("/mock/AppData/Roaming", "Windsurf", "logs")
        );
        expect(p.antigravityVscdbPath()).toBe(
          path.join("/mock/AppData/Roaming", "Antigravity", "User", "globalStorage", "state.vscdb")
        );
      } finally {
        if (prev === undefined) delete process.env.APPDATA;
        else process.env.APPDATA = prev;
      }
    });

    it("falls back to homedir/AppData/Roaming when APPDATA is unset", () => {
      const prev = process.env.APPDATA;
      try {
        delete process.env.APPDATA;
        const home = os.homedir();
        const p = createPlatformPaths("win32");
        const expected = path.join(home, "AppData", "Roaming");

        expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
        expect(p.windsurfLogsRoot()).toBe(path.join(expected, "Windsurf", "logs"));
      } finally {
        if (prev === undefined) delete process.env.APPDATA;
        else process.env.APPDATA = prev;
      }
    });

    it("treats empty APPDATA as unset", () => {
      const prev = process.env.APPDATA;
      try {
        process.env.APPDATA = "";
        const home = os.homedir();
        const p = createPlatformPaths("win32");
        const expected = path.join(home, "AppData", "Roaming");

        expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
      } finally {
        if (prev === undefined) delete process.env.APPDATA;
        else process.env.APPDATA = prev;
      }
    });
  });

  describe("linux", () => {
    it("uses XDG_CONFIG_HOME when set", () => {
      const prev = process.env.XDG_CONFIG_HOME;
      try {
        process.env.XDG_CONFIG_HOME = "/mock/.config";
        const p = createPlatformPaths("linux");

        expect(p.antigravityLogsRoot()).toBe(
          path.join("/mock/.config", "Antigravity", "logs")
        );
        expect(p.windsurfLogsRoot()).toBe(
          path.join("/mock/.config", "Windsurf", "logs")
        );
        expect(p.antigravityVscdbPath()).toBe(
          path.join("/mock/.config", "Antigravity", "User", "globalStorage", "state.vscdb")
        );
      } finally {
        if (prev === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = prev;
      }
    });

    it("falls back to homedir/.config when XDG_CONFIG_HOME is unset", () => {
      const prev = process.env.XDG_CONFIG_HOME;
      try {
        delete process.env.XDG_CONFIG_HOME;
        const home = os.homedir();
        const p = createPlatformPaths("linux");
        const expected = path.join(home, ".config");

        expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
        expect(p.windsurfLogsRoot()).toBe(path.join(expected, "Windsurf", "logs"));
      } finally {
        if (prev === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = prev;
      }
    });

    it("treats empty XDG_CONFIG_HOME as unset", () => {
      const prev = process.env.XDG_CONFIG_HOME;
      try {
        process.env.XDG_CONFIG_HOME = "";
        const home = os.homedir();
        const p = createPlatformPaths("linux");
        const expected = path.join(home, ".config");

        expect(p.antigravityLogsRoot()).toBe(path.join(expected, "Antigravity", "logs"));
      } finally {
        if (prev === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = prev;
      }
    });
  });

  describe("unknown platform", () => {
    it("falls back to linux-style paths", () => {
      const prev = process.env.XDG_CONFIG_HOME;
      try {
        process.env.XDG_CONFIG_HOME = "/xdg";
        const p = createPlatformPaths("freebsd" as NodeJS.Platform);

        expect(p.antigravityLogsRoot()).toBe(path.join("/xdg", "Antigravity", "logs"));
      } finally {
        if (prev === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = prev;
      }
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
