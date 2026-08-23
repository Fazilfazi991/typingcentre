"use client";

import { useActionState, useEffect, useRef } from "react";
import { demoLoginAction } from "../demo-actions";

export function DemoLoginButton({ autoStart = false }: { autoStart?: boolean }) {
  const [state, action, pending] = useActionState(demoLoginAction, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (autoStart) form.current?.requestSubmit();
  }, [autoStart]);

  return <form action={action} ref={form} className="auth-links">
    {state.error && <p className="auth-error" role="alert">{state.error}</p>}
    <button type="submit" disabled={pending} className="auth-link-button">
      {pending || autoStart ? "Opening demo..." : "Try the demo"}
    </button>
  </form>;
}
