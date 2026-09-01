"use client";

import { useActionState, useEffect, useState } from "react";
import { parseSupabaseSessionHash } from "@/lib/auth/url-session";
import { resetPasswordAction } from "../actions";

type RecoveryState = "checking" | "ready" | "invalid";

export default function ResetPassword() {
  const [state, action, pending] = useActionState(resetPasswordAction, { error: "" });
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");

  useEffect(() => {
    let active = true;

    async function establishRecoverySession() {
      const hash = window.location.hash;
      const session = parseSupabaseSessionHash(hash);

      // Remove credentials and auth errors from the visible URL immediately.
      if (hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

      const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (active) setRecoveryState("invalid");
        return;
      }

      if (session) {
        const { error } = await supabase.auth.setSession(session);
        if (active) setRecoveryState(error ? "invalid" : "ready");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (active) setRecoveryState(data.session ? "ready" : "invalid");
    }

    void establishRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  if (recoveryState === "checking") {
    return <main className="auth"><p>Verifying your secure recovery link…</p></main>;
  }

  if (recoveryState === "invalid") {
    return <main className="auth"><section><h1>This link is no longer valid</h1><p>Request a new password reset link and use only the most recent email.</p><a href="/forgot-password">Request a new link</a></section></main>;
  }

  return (
    <main className="auth">
      <form action={action}>
        <h1>Choose a new password</h1>
        <input name="password" type="password" placeholder="New password" autoComplete="new-password" required />
        <input name="confirmPassword" type="password" placeholder="Confirm password" autoComplete="new-password" required />
        <button disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
        {state.error && <p role="alert">{state.error}</p>}
      </form>
    </main>
  );
}
