import { WorkspaceShell } from "@/components/workspace-shell";
import { ImportUploader } from "./import-uploader";
import { getWorkspaceContext } from "@/lib/workspace/context";

export const dynamic = "force-dynamic";

export default async function NewImportPage() {
  const context = await getWorkspaceContext("/imports/new");
  return <WorkspaceShell organizationName={context?.organization.name ?? "Note It"} activePath="/imports"><ImportUploader /></WorkspaceShell>;
}
