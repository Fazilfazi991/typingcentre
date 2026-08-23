import { NoteItLogo } from "@/components/note-it-logo";
import { DemoLoginButton } from "@/app/(auth)/login/demo-login-button";

export default function Demo() {
  return <main className="auth"><section className="auth-panel" aria-labelledby="demo-title">
    <div className="auth-brand"><NoteItLogo className="auth-logo" /></div>
    <div className="auth-intro"><p>Sample workspace</p><h1 id="demo-title">Opening the Note It demo</h1><span>You’re about to explore fictional sample data.</span></div>
    <DemoLoginButton autoStart />
  </section></main>;
}
