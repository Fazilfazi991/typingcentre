import Link from "next/link";

export function DemoLoginButton() {
  return <div className="auth-links">
    <a href="/forgot-password">Forgot password?</a>
    <Link href="/demo" prefetch={false}>Open Demo</Link>
  </div>;
}
