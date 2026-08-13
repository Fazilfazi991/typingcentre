"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({ className, label, pendingLabel }: { className: string; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending}>{pending ? pendingLabel : label}</button>;
}
