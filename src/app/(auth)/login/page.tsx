"use client";
import { useActionState, useState } from "react";
import { loginAction } from "../actions";
import { NoteItLogo } from "@/components/note-it-logo";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="auth">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-brand"><NoteItLogo className="auth-logo" /></div>
        <div className="auth-intro">
          <p>Document management workspace</p>
          <h1 id="login-title">Welcome to Note It</h1>
          <span>Stay ahead of document expiries, renewals and follow-ups.</span>
        </div>
        <form action={action} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="name@company.com" required />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {state.error && <p className="auth-error" role="alert">{state.error}</p>}
          <button className="auth-submit" disabled={pending} type="submit">{pending ? "Signing in..." : "Sign in"}</button>
          <div className="auth-links">
            <a href="/forgot-password">Forgot password?</a>
            <a href="/demo">Try the demo</a>
          </div>
        </form>
      </section>
    </main>
  );
}
