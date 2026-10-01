import React from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ImportUploader } from "./import-uploader";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { isDemoWorkspace } from "@/lib/demo/workspace";
import { notFound } from "next/navigation";
import { DemoImport } from "./demo-import";
import { canUseDemoImport, getDemoImport } from "@/lib/imports/demo";
import type { DemoImportState } from "@/lib/imports/demo-types";

export const dynamic = "force-dynamic";

export default async function NewImportPage() {
  const context = await getWorkspaceContext("/imports/new");
  if (context && isDemoWorkspace({ organizationId: context.organization.id, organizationSlug: context.organization.slug })) {
    if (!canUseDemoImport(context)) notFound();
    let sample = null;
    let initialError = "";
    try { sample = await getDemoImport(context); } catch { initialError = "This sample preview needs a fresh start. Reset Demo & Try Again."; }
    return <WorkspaceShell organizationName={context.organization.name} activePath="/imports"><DemoImport initialSample={sample as DemoImportState | null} initialError={initialError}/></WorkspaceShell>;
  }
  if (!context || !["owner", "admin"].includes(context.membership.role)) notFound();
  return <WorkspaceShell organizationName={context.organization.name} activePath="/imports"><ImportUploader /></WorkspaceShell>;
}
