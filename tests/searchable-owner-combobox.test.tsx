// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchableOwnerCombobox } from "@/components/searchable-owner-combobox";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SearchableOwnerCombobox", () => {
  it("loads default records, filters after two characters, and selects with the keyboard", async () => {
    const onChange = vi.fn();
    const fetchMock = vi.fn((url: string) => Promise.resolve({ json: () => Promise.resolve({ results: url.includes("q=ah") ? [{ id: "customer-2", label: "Ahmed Hassan", description: "Pearl Business Setup · +971500000000" }] : [{ id: "customer-1", label: "Aisha Ali", description: "North Star · +971511111111" }] }) }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<SearchableOwnerCombobox kind="customer" name="customerId" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /select a customer/i }));

    await screen.findByRole("option", { name: /aisha ali/i });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("kind=customer"), expect.any(Object));
    expect(fetchMock.mock.calls[0][0]).not.toContain("q=");

    const input = screen.getByRole("textbox", { name: /search customer/i });
    await user.type(input, "ah");
    await screen.findByRole("option", { name: /ahmed hassan/i });
    expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("q=ah");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("customer-2", expect.objectContaining({ label: "Ahmed Hassan" }));
    expect(screen.getByRole("button", { name: /ahmed hassan/i }).getAttribute("aria-expanded")).toBe("false");
  });

  it("opens on mobile without forcing the software keyboard and dismisses focus after selection", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ results: [{ id: "customer-1", label: "Aisha Ali", description: "North Star · +971511111111" }] }) })));
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableOwnerCombobox kind="customer" name="customerId" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /select a customer/i }));
    const search = screen.getByRole("textbox", { name: /search customer/i });
    expect(document.activeElement).not.toBe(search);
    await user.click(search);
    await user.click(await screen.findByRole("option", { name: /aisha ali/i }));

    expect(onChange).toHaveBeenCalledWith("customer-1", expect.objectContaining({ label: "Aisha Ali" }));
    expect(document.activeElement).not.toBe(search);
    expect(document.body.classList.contains("owner-picker-open")).toBe(false);
  });
});
