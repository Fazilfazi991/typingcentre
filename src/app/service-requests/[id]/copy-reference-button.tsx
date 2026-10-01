"use client";

import { useState } from "react";

export function CopyReferenceButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="service-copy-button" type="button" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  }} aria-label={`Copy ${label}`}>{copied ? "Copied" : "Copy"}</button>;
}
