import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaceContext, redirect, revalidatePath } = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/workspace/context", () => ({ getWorkspaceContext }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  completeRenewalAction,
  markRenewalContactedAction,
  scheduleRenewalFollowUpAction,
} from "@/features/renewals/actions";

const documentId = "11111111-1111-4111-8111-111111111111";
const renewalId = "22222222-2222-4222-8222-222222222222";
const replacementId = "33333333-3333-4333-8333-333333333333";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function createContext(options: { foreignDocument?: boolean } = {}) {
  const operations: Array<{ table: string; operation: string; value?: any }> = [];
  const rpc = vi.fn(async (name: string) => name === "complete_document_renewal"
    ? { data: [{ renewal_id: renewalId, replacement_document_id: replacementId }], error: null }
    : { data: null, error: null });
  const from = (table: string) => {
    let operation = "select";
    let payload: any;
    const filters: Record<string, unknown> = {};
    const builder: any = {
      select: () => builder,
      insert: (value: any) => { operation = "insert"; payload = value; operations.push({ table, operation, value }); return builder; },
      update: (value: any) => { operation = "update"; payload = value; operations.push({ table, operation, value }); return builder; },
      eq: (key: string, value: unknown) => { filters[key] = value; return builder; },
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => {
        if (table === "documents") return { data: options.foreignDocument ? null : { id: documentId, customer_id: "customer-a", company_id: null, archived_at: null }, error: null };
        if (table === "renewals") return { data: { id: renewalId, status: "draft", notes: null, started_at: null }, error: null };
        return { data: null, error: null };
      },
      single: async () => ({ data: { id: renewalId, status: "draft", notes: null, started_at: null }, error: null }),
      then: (resolve: (value: unknown) => unknown) => resolve({ data: payload, error: null, filters, operation }),
    };
    return builder;
  };
  getWorkspaceContext.mockResolvedValue({
    supabase: { from, rpc },
    organization: { id: "tenant-a" },
    user: { id: "owner-a" },
  });
  return { operations, rpc };
}

describe("renewal server actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records contacted status and activity within the trusted tenant", async () => {
    const { operations, rpc } = createContext();
    await expect(markRenewalContactedAction(form({ documentId, range: "7d" }))).rejects.toThrow(`REDIRECT:/renewals/${documentId}?range=7d&contacted=1`);
    expect(operations).toContainEqual(expect.objectContaining({ table: "renewals", operation: "update", value: expect.objectContaining({ status: "in_progress" }) }));
    expect(rpc).toHaveBeenCalledWith("log_workspace_activity", expect.objectContaining({ event_kind: "renewal_contacted", entity_id: renewalId }));
  });

  it("creates a Dubai-time follow-up connected to the expiring document", async () => {
    const { operations, rpc } = createContext();
    await expect(scheduleRenewalFollowUpAction(form({ documentId, range: "30d", dueAt: "2026-08-20T09:00", note: "Call customer" }))).rejects.toThrow(`REDIRECT:/renewals/${documentId}?range=30d&followUp=created`);
    expect(operations).toContainEqual(expect.objectContaining({ table: "follow_ups", operation: "insert", value: expect.objectContaining({ document_id: documentId, due_at: "2026-08-20T05:00:00.000Z", created_by: "owner-a" }) }));
    expect(rpc).toHaveBeenCalledWith("log_workspace_activity", expect.objectContaining({ event_kind: "renewal_follow_up_scheduled" }));
  });

  it("completes through the atomic renewal RPC with a future replacement", async () => {
    const { rpc } = createContext();
    await expect(completeRenewalAction(form({ documentId, range: "today", documentNumber: "NEW-1", issueDate: "2026-08-13", expiryDate: "2027-08-13", note: "Renewed" }))).rejects.toThrow(`REDIRECT:/renewals/${documentId}?range=today&renewed=1&replacement=${replacementId}`);
    expect(rpc).toHaveBeenCalledWith("complete_document_renewal", expect.objectContaining({ target_document_id: documentId, replacement_expires_on: "2027-08-13" }));
  });

  it("cannot mutate a foreign-tenant document even when its UUID is submitted", async () => {
    const { operations, rpc } = createContext({ foreignDocument: true });
    await expect(markRenewalContactedAction(form({ documentId, range: "7d" }))).rejects.toThrow("REDIRECT:/renewals?range=30d&error=unavailable");
    expect(operations).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
