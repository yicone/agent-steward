import { describe, expect, it } from "vitest";

import { classifyCsrfTokenSource } from "../src/lib/parse/tokenSource";

describe("classifyCsrfTokenSource", () => {
  it("prefers process args token", () => {
    expect(
      classifyCsrfTokenSource({
        tokenFromPs: "ps-token",
        overrideToken: "override-token",
        discoveryToken: "discovery-token"
      })
    ).toEqual({ token: "ps-token", source: "ps_args" });
  });

  it("falls back to override token", () => {
    expect(
      classifyCsrfTokenSource({
        tokenFromPs: null,
        overrideToken: "override-token",
        discoveryToken: "discovery-token"
      })
    ).toEqual({ token: "override-token", source: "override" });
  });

  it("falls back to discovery token", () => {
    expect(
      classifyCsrfTokenSource({
        tokenFromPs: null,
        overrideToken: "",
        discoveryToken: "discovery-token"
      })
    ).toEqual({ token: "discovery-token", source: "discovery_file" });
  });

  it("returns none when no token exists", () => {
    expect(classifyCsrfTokenSource({ tokenFromPs: "", overrideToken: "", discoveryToken: null })).toEqual({
      token: null,
      source: "none"
    });
  });
});
