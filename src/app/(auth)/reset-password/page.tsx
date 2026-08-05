"use client";
import { useActionState } from "react"; import { resetPasswordAction } from "../actions";
export default function ResetPassword() { const [state, action, pending] = useActionState(resetPasswordAction, { error: "" }); return <main className="auth"><form action={action}><h1>Choose a new password</h1><input name="password" type="password" placeholder="New password" required /><input name="confirmPassword" type="password" placeholder="Confirm password" required /><button disabled={pending}>Save password</button>{state.error && <p role="alert">{state.error}</p>}</form></main>; }
