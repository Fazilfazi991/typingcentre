"use client";

import React, { useRef, useState, type FormEvent, type ReactNode } from "react";

type MutationResult = { error?: string } | void;

export function RequestMutationForm({ action, requestId, section, className, children }: {
  action: (form: FormData) => Promise<MutationResult>;
  requestId: string;
  section: string;
  className?: string;
  children: ReactNode;
}) {
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await action(new FormData(event.currentTarget));
      if (result?.error) {
        setError(result.error);
        submitting.current = false;
        setPending(false);
        return;
      }
      window.location.assign(`/service-requests/${requestId}?saved=${Date.now()}#${section}`);
    } catch {
      setError("Could not save this change. Please try again.");
      submitting.current = false;
      setPending(false);
    }
  }

  return <form className={className} onSubmit={submit} aria-busy={pending}>
    {children}
    {pending && <span className="service-saving" role="status">Saving…</span>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
