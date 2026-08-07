"use client";

export default function RootError({ reset }: { reset: () => void }) {
  return (
    <main className="route-error" role="alert">
      <section>
        <span aria-hidden="true">RT</span>
        <h1>We could not load this workspace</h1>
        <p>Please try again. Your data has not been changed.</p>
        <button type="button" onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
