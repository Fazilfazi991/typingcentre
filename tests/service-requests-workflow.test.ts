import { describe, expect, it } from "vitest";
import { allowedTransitions, calculateTotal, canTransition, paymentStatus, requestStatuses } from "@/lib/service-requests/workflow";

describe("service request workflow", () => {
  it("does not permit a skipped submission or changes after completion", () => {
    expect(canTransition("new","completed")).toBe(false);
    expect(canTransition("new","submitted")).toBe(false);
    expect(canTransition("ready_to_submit","submitted")).toBe(true);
    expect(canTransition("ready_for_collection","completed")).toBe(true);
    expect(allowedTransitions.completed).toEqual([]);
  });

  it("defines every status once and only transitions to known statuses", () => {
    expect(new Set(requestStatuses).size).toBe(requestStatuses.length);
    for (const status of requestStatuses) for (const next of allowedTransitions[status]) expect(requestStatuses).toContain(next);
  });

  it("calculates the display total and balance states in cents", () => {
    expect(calculateTotal(850,25.5,220,100)).toBe(995.5);
    expect(paymentStatus(995.5,0)).toBe("unpaid");
    expect(paymentStatus(995.5,300)).toBe("part_paid");
    expect(paymentStatus(995.5,995.5)).toBe("paid");
  });
});
