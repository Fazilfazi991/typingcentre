"use client";

import { useEffect, useRef, useState } from "react";

export function ActionMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function close() {
    setOpen(false);
    detailsRef.current?.removeAttribute("open");
    detailsRef.current?.querySelector<HTMLElement>("summary")?.focus();
  }

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <details className="action-menu" ref={detailsRef} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary aria-label={label}>...</summary>
      <div className="action-menu-panel">{children}</div>
    </details>
  );
}
