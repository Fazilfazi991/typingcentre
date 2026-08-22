import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FollowUpList } from "@/app/follow-ups/follow-up-list";

describe("FollowUpList", () => {
  it("groups records and keeps completion controls collapsed until a record is selected", () => {
    const html = renderToStaticMarkup(
      <FollowUpList
        destination="/follow-ups"
        now="2026-08-22T12:00:00.000Z"
        timezone="Asia/Dubai"
        followUps={[
          { id: "overdue", due_at: "2026-08-21T10:00:00.000Z", status: "pending", note: "Call back", customers: { full_name: "Amina" } },
          { id: "upcoming", due_at: "2026-08-23T10:00:00.000Z", status: "pending", note: "Send quote", companies: { name: "Atlas LLC" } },
          { id: "completed", due_at: "2026-08-20T10:00:00.000Z", status: "completed", note: "Done", customers: { full_name: "Noor" } },
        ]}
      />,
    );

    expect(html).toContain("Overdue");
    expect(html).toContain("Upcoming");
    expect(html).toContain("Completed");
    expect(html).toContain("Call back");
    expect(html).toContain("Send quote");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Customer response");
    expect(html).not.toContain("Complete follow-up");
  });
});
