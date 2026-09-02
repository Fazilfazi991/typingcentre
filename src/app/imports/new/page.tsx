import { WorkspaceShell } from "@/components/workspace-shell";
import { ImportUploader } from "./import-uploader";
import { getWorkspaceContext } from "@/lib/workspace/context";
import { isDemoWorkspace } from "@/lib/demo/workspace";

export const dynamic = "force-dynamic";

export default async function NewImportPage() {
  const context = await getWorkspaceContext("/imports/new");
  if (context && isDemoWorkspace({ organizationId: context.organization.id, organizationSlug: context.organization.slug })) return <WorkspaceShell organizationName={context.organization.name} activePath="/imports"><section className="panel demo-blocked-state"><h1>Data import is disabled in Demo Mode.</h1><p>The shared demo supports hands-on customer, document, renewal, and follow-up workflows without bulk imports.</p></section></WorkspaceShell>;
  return <WorkspaceShell organizationName={context?.organization.name ?? "Note It"} activePath="/imports"><ImportUploader /></WorkspaceShell>;
}
