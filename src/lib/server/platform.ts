import "server-only";

import os from "node:os";
import path from "node:path";

/**
 * Platform-specific path helpers for discovering Antigravity and Windsurf
 * language server instances and their local storage.
 *
 * macOS is the reference implementation (validated). Windows and Linux paths
 * follow VS Code / Electron conventions but are **unvalidated** — see inline
 * TODOs. When adding a new platform, keep the macOS implementation as the
 * template and validate each path against the real application layout.
 *
 * Process-arg / token extraction notes (platform-specific):
 *   macOS / Linux — `ps` with appropriate flags (see antigravity.ts / windsurf.ts).
 *   Windows      — TODO: use `wmic` or PowerShell to read process command lines
 *                  and environment variables. The `ps`-based helpers will not work.
 */

export interface PlatformPaths {
  /** Root directory containing Antigravity extension host log session folders. */
  antigravityLogsRoot(): string;
  /** Root directory containing Windsurf extension host log session folders. */
  windsurfLogsRoot(): string;
  /** Default path for Antigravity VS Code global state database. */
  antigravityVscdbPath(): string;
  /**
   * Path to the `sqlite3` CLI binary used for reading VS Code global state.
   * Returns `null` when no known binary location exists for this platform.
   */
  sqlite3Binary(): string | null;
}

// ---------------------------------------------------------------------------
// macOS (reference / validated)
// ---------------------------------------------------------------------------

function darwinPaths(): PlatformPaths {
  const home = os.homedir();
  return {
    antigravityLogsRoot: () =>
      path.join(home, "Library", "Application Support", "Antigravity", "logs"),
    windsurfLogsRoot: () =>
      path.join(home, "Library", "Application Support", "Windsurf", "logs"),
    antigravityVscdbPath: () =>
      path.join(home, "Library", "Application Support", "Antigravity", "User", "globalStorage", "state.vscdb"),
    sqlite3Binary: () => "/usr/bin/sqlite3",
  };
}

// ---------------------------------------------------------------------------
// Windows (unvalidated; follows VS Code / Electron conventions)
// ---------------------------------------------------------------------------
// TODO: Validate these paths on a real Windows installation of Antigravity
//       and Windsurf. Electron-based VS Code forks typically store user data
//       under %APPDATA%\<AppName>.

function win32Paths(): PlatformPaths {
  const appData = process.env.APPDATA?.trim() || path.join(os.homedir(), "AppData", "Roaming");
  return {
    antigravityLogsRoot: () =>
      path.join(appData, "Antigravity", "logs"),
    windsurfLogsRoot: () =>
      path.join(appData, "Windsurf", "logs"),
    antigravityVscdbPath: () =>
      path.join(appData, "Antigravity", "User", "globalStorage", "state.vscdb"),
    // TODO: Validate — sqlite3 is not typically available on Windows by default.
    //       Consider bundling or documenting a required install.
    sqlite3Binary: () => null,
  };
}

// ---------------------------------------------------------------------------
// Linux (unvalidated; follows XDG / Electron conventions)
// ---------------------------------------------------------------------------
// TODO: Validate these paths on a real Linux installation of Antigravity
//       and Windsurf. Electron-based VS Code forks typically honour
//       $XDG_CONFIG_HOME (default ~/.config) on Linux.

function linuxPaths(): PlatformPaths {
  const configHome = process.env.XDG_CONFIG_HOME?.trim() || path.join(os.homedir(), ".config");
  return {
    antigravityLogsRoot: () =>
      path.join(configHome, "Antigravity", "logs"),
    windsurfLogsRoot: () =>
      path.join(configHome, "Windsurf", "logs"),
    antigravityVscdbPath: () =>
      path.join(configHome, "Antigravity", "User", "globalStorage", "state.vscdb"),
    sqlite3Binary: () => "/usr/bin/sqlite3",
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build a PlatformPaths instance for the given platform identifier.
 *
 * @note The `platform` parameter controls which path **segments** are chosen
 * (e.g. `Library/Application Support` vs `AppData/Roaming`) but the paths are
 * always assembled with the host-native `path.join`, so separators match the
 * machine the code actually runs on. This is intentional: the parameter exists
 * for unit-test segment verification, not for producing foreign-OS paths.
 */
export function createPlatformPaths(platform?: NodeJS.Platform): PlatformPaths {
  const p = platform ?? process.platform;
  switch (p) {
    case "darwin":
      return darwinPaths();
    case "win32":
      return win32Paths();
    default:
      return linuxPaths();
  }
}

/** Singleton resolved for the current runtime platform. */
export const platformPaths: PlatformPaths = createPlatformPaths();
