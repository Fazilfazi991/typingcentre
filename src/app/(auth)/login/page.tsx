import { safeNext } from "@/lib/auth/validation";
import { NoteItLogo } from "@/components/note-it-logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawNext = (await searchParams).next;
  const next = safeNext(typeof rawNext === "string" ? rawNext : undefined);

  return (
    <main className="auth">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-brand"><NoteItLogo className="auth-logo" /></div>
        <div className="auth-intro">
          <p>Document management workspace</p>
          <h1 id="login-title">Welcome to Note It</h1>
          <span>Stay ahead of document expiries, renewals and follow-ups.</span>
        </div>
        <LoginForm next={next} />
      </section>
    </main>
  );
}
