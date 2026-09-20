import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import ContinueSurface from "@/components/ContinueSurface";
import WorkItemSurface, { deriveWorkItemActionAvailability } from "@/components/WorkItemSurface";

describe("continuity surfaces", () => {
  it("renders the Continue Work entry point", () => {
    const html = renderToStaticMarkup(
      <ContinueSurface projectRootPath="/workspace/project" onOpenWorkItem={() => undefined} />
    );
    expect(html).toContain("Continue Work");
    expect(html).toContain("Create Work Item");
  });

  it("explains the empty Work Item selection state", () => {
    const html = renderToStaticMarkup(<WorkItemSurface workItemId={null} onBack={() => undefined} onOpenSessions={() => undefined} />);
    expect(html).toContain("Choose a Work Item");
    expect(html).toContain("Open Continue Work");
  });

  it("allows organized Work Items to enter active work normally", () => {
    expect(deriveWorkItemActionAvailability("organized")).toMatchObject({ canActivate: true, canComplete: false });
    expect(deriveWorkItemActionAvailability("active")).toMatchObject({ canActivate: false, canComplete: true });
  });
});
