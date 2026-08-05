"use client";
import { useActionState } from "react"; import { resetRequestAction } from "../actions";
export default function ForgotPassword() { const [state, action, pending] = useActionState(resetRequestAction, { message: "" }); return <main className="auth"><form action={action}><h1>Reset your password</h1><input name="email" type="email" placeholder="Email address" required /><button disabled={pending}>Send reset link</button><p>{state.message}</p><a href="/login">Back to sign in</a></form></main>; }
