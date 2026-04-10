export type SessionBackupDiagnosticCode =
  | "INVALID_REQUEST"
  | "BACKUP_NOT_FOUND"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INVALID_BACKUP_PACKAGE"
  | "SOURCE_COPY_UNSUPPORTED"
  | "SOURCE_COPY_RISK"
  | "BACKUP_CREATE_FAILED"
  | "BACKUP_IMPORT_FAILED"
  | "BACKUP_VERIFY_FAILED";

export type SessionBackupDiagnostic = {
  code: SessionBackupDiagnosticCode;
  title: string;
  message: string;
  hint?: string;
};

function hasNodeErrorCode(value: unknown): value is NodeJS.ErrnoException {
  return typeof value === "object" && value !== null && "code" in value;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isUnsupportedSchemaError(message: string): boolean {
  return message.includes("Unsupported session backup schema version")
    || message.includes("Unsupported session record schema version");
}

function isInvalidPackageError(message: string): boolean {
  return message.includes("checksum mismatch")
    || message.includes("Invalid JSON")
    || message.includes("Expected a JSON object")
    || message.includes("Session backup manifest")
    || message.includes("Session record must include")
    || message.includes("Session record events must be an array")
    || message.includes("ENOENT");
}

export function classifySessionBackupError(
  error: unknown,
  fallbackCode: Extract<SessionBackupDiagnosticCode, "BACKUP_CREATE_FAILED" | "BACKUP_IMPORT_FAILED" | "BACKUP_VERIFY_FAILED">
): SessionBackupDiagnostic {
  const message = messageOf(error);

  if (hasNodeErrorCode(error) && error.code === "ENOENT") {
    return {
      code: "BACKUP_NOT_FOUND",
      title: "Backup not found",
      message: "The requested backup package could not be found in the managed backup store.",
      hint: "Check the backup ID and verify the package still exists under the product-managed backup root."
    };
  }

  if (isUnsupportedSchemaError(message)) {
    return {
      code: "UNSUPPORTED_SCHEMA_VERSION",
      title: "Unsupported backup schema",
      message,
      hint: "Create a new backup with the current app version or add a migrator before importing this package."
    };
  }

  if (isInvalidPackageError(message)) {
    return {
      code: "INVALID_BACKUP_PACKAGE",
      title: "Invalid backup package",
      message,
      hint: "Verify the package contents and checksums before retrying the import or verify action."
    };
  }

  return {
    code: fallbackCode,
    title:
      fallbackCode === "BACKUP_CREATE_FAILED"
        ? "Backup failed"
        : fallbackCode === "BACKUP_IMPORT_FAILED"
          ? "Import failed"
          : "Verify failed",
    message,
  };
}
