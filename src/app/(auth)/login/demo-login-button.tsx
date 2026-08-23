"use client";

import { useActionState, useEffect, useRef } from "react";
import { demoLoginAction } from "../demo-actions";

export function DemoLoginButton({ autoStart = false }: { autoStart?: boolean }) {
  const [state, action, pending] = useActionState(demoLoginAction, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (autoStart) form.current?.requestSubmit();
  }, [autoStart]);

  return <>
    {state.error && <p className="auth-error" role="alert">{state.error}</p>}
    <div className="auth-links">
      <a href="/forgot-password">Forgot password?</a>
      <form action={action} ref={form}>
        <button type="submit" disabled={pending} style={{ appearance: "none", border: 0, background: "transparent", color: "#6338d8", cursor: pending ? "wait" : "pointer", font: "700 13px inherit", padding: 0 }}>
          {pending || autoStart ? "Opening demo..." : "Try the demo"}
        </button>
      </form>
    </div>
  </>;
}
