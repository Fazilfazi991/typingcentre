import "server-only";
import type { WorkspaceContext } from "@/lib/workspace/context";
import { isDemoWorkspace } from "./workspace";

export function isDemoContext(context: WorkspaceContext) {
  return isDemoWorkspace({ organizationId: context.organization.id, organizationSlug: context.organization.slug });
}
