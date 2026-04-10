import { describe, expect, it } from "vitest";

import { classifySessionBackupError } from "@/lib/sessionBackupDiagnostics";

describe("classifySessionBackupError", () => {
  it("maps unsupported schema errors to stable diagnostics", () => {
    expect(
      classifySessionBackupError(
        new Error("Unsupported session backup schema version: session-backup/v0"),
        "BACKUP_VERIFY_FAILED"
      )
    ).toEqual({
      code: "UNSUPPORTED_SCHEMA_VERSION",
      title: "Unsupported backup schema",
      message: "Unsupported session backup schema version: session-backup/v0",
      hint: "Create a new backup with the current app version or add a migrator before importing this package."
    });
  });

  it("maps checksum mismatches to invalid-package diagnostics", () => {
    expect(
      classifySessionBackupError(
        new Error("Session backup record checksum mismatch: session-1"),
        "BACKUP_IMPORT_FAILED"
      )
    ).toEqual({
      code: "INVALID_BACKUP_PACKAGE",
      title: "Invalid backup package",
      message: "Session backup record checksum mismatch: session-1",
      hint: "Verify the package contents and checksums before retrying the import or verify action."
    });
  });

  it("maps ENOENT to backup-not-found diagnostics", () => {
    const error = new Error("ENOENT: no such file or directory");
    Object.assign(error, { code: "ENOENT" });

    expect(classifySessionBackupError(error, "BACKUP_IMPORT_FAILED")).toEqual({
      code: "BACKUP_NOT_FOUND",
      title: "Backup not found",
      message: "The requested backup package could not be found in the managed backup store.",
      hint: "Check the backup ID and verify the package still exists under the product-managed backup root."
    });
  });
});
