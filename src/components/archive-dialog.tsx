"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

function ConfirmButton({ label }: { label: string }) { const { pending } = useFormStatus(); return <button className="danger-button" disabled={pending}>{pending ? "Archiving..." : label}</button>; }

export function ArchiveDialog({ action, fields, entityName, title, description, confirmLabel }: { action: (formData: FormData) => void; fields: Record<string, string>; entityName: string; title: string; description: string; confirmLabel: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button type="button" className="link-button" aria-label={`Archive ${entityName}`} onClick={() => dialog.current?.showModal()}>Archive</button><dialog ref={dialog} aria-labelledby="archive-title"><form method="dialog"><button className="quiet-button" aria-label="Close archive dialog">Close</button></form><h2 id="archive-title">{title}</h2><p>{description}</p><form action={action}>{Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value}/>)}<div className="actions"><button type="button" className="quiet-button" onClick={() => dialog.current?.close()}>Cancel</button><ConfirmButton label={confirmLabel}/></div></form></dialog></>;
}
