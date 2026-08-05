"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="danger-button" disabled={pending} aria-disabled={pending}>
      {pending ? "Archiving..." : label}
    </button>
  );
}

export function ArchiveDialog({
  action,
  fields,
  entityName,
  title,
  description,
  confirmLabel,
}: {
  action: (formData: FormData) => void;
  fields: Record<string, string>;
  entityName: string;
  title: string;
  description: string;
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const firstButton = panelRef.current?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.removeAttribute("open");
    triggerRef.current?.querySelector<HTMLElement>("summary")?.focus();
  }

  return (
    <details
      className="archive-disclosure"
      ref={triggerRef}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="link-button" aria-label={`Archive ${entityName}`}>
        Archive
      </summary>
      {open && (
        <div
          className="archive-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          ref={panelRef}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        >
          <button type="button" className="quiet-button" aria-label="Close archive dialog" onClick={close}>
            Close
          </button>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
          <p>
            <strong>{entityName}</strong>
          </p>
          <form action={action}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <div className="actions">
              <button type="button" className="quiet-button dark" onClick={close}>
                Cancel
              </button>
              <ConfirmButton label={confirmLabel} />
            </div>
          </form>
        </div>
      )}
    </details>
  );
}
