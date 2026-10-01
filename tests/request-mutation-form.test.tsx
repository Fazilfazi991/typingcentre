// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequestMutationForm } from "@/app/service-requests/[id]/request-mutation-form";

afterEach(cleanup);

describe("service request mutation form", () => {
  it("shows a server validation error and allows the user to correct the form", async () => {
    const action = vi.fn().mockResolvedValueOnce({ error: "Payment exceeds the outstanding balance." });
    render(<RequestMutationForm action={action} requestId="request-1" section="payments"><input name="amount" defaultValue="999"/><button>Record payment</button></RequestMutationForm>);
    fireEvent.submit(screen.getByRole("button", { name: "Record payment" }).closest("form")!);
    expect((await screen.findByRole("alert")).textContent).toContain("Payment exceeds the outstanding balance.");
    expect(action).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Record payment" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("blocks a duplicate submission while the server action is pending", async () => {
    let resolveAction!: (value: { error: string }) => void;
    const action = vi.fn(() => new Promise<{ error: string }>((resolve) => { resolveAction = resolve; }));
    render(<RequestMutationForm action={action} requestId="request-1" section="workflow"><button>Update status</button></RequestMutationForm>);
    const form = screen.getByRole("button", { name: "Update status" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("Saving");
    resolveAction({ error: "Try again." });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Try again."));
  });
});
