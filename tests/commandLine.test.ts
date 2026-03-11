import { describe, expect, it } from "vitest";

import { extractCsrfTokenFromCommand } from "../src/lib/parse/commandLine";

describe("extractCsrfTokenFromCommand", () => {
  it("extracts token from spaced arg", () => {
    expect(extractCsrfTokenFromCommand("... --csrf_token 11111111-2222-3333-4444-555555555555 ...")).toBe(
      "11111111-2222-3333-4444-555555555555"
    );
  });

  it("extracts token from equals arg", () => {
    expect(extractCsrfTokenFromCommand("... --csrf_token=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee ...")).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    );
  });

  it("extracts token from dash arg", () => {
    expect(extractCsrfTokenFromCommand("... --csrf-token aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee ...")).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    );
  });

  it("extracts token from camelCase arg", () => {
    expect(extractCsrfTokenFromCommand("... --csrfToken=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee ...")).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    );
  });

  it("extracts token from env var", () => {
    expect(extractCsrfTokenFromCommand("... CODEIUM_CSRF_TOKEN=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee ...")).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    );
  });

  it("extracts token from Windsurf env var", () => {
    expect(extractCsrfTokenFromCommand("... WINDSURF_CSRF_TOKEN=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee ...")).toBe(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    );
  });
});
