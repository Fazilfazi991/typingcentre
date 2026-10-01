// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNavigation } from "@/components/mobile-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/customers" }));

describe("MobileNavigation", () => {
  afterEach(cleanup);
  beforeEach(() => document.body.className = "");

  it("keeps service requests within one tap and marks More for the current customer route", () => {
    render(<MobileNavigation canImport={false} logoutAction={vi.fn()} />);
    expect(screen.getByRole("navigation", { name: /mobile workspace/i })).toBeTruthy();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["Dashboard", "Service Requests", "Documents", "Calendar"]);
    expect(screen.getByRole("button", { name: "More" }).getAttribute("class")?.length).toBeGreaterThan(0);
  });

  it("opens and closes the More sheet without exposing Import to members", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation canImport={false} logoutAction={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("dialog", { name: "More" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Customers/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Service catalogue/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Companies/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Import data/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
