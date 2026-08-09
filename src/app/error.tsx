"use client";

import { NoteItLogo } from "@/components/note-it-logo";

export default function RootError({ reset }: { reset: () => void }) {
  return (
    <main className="route-error" role="alert">
      <section>
        <NoteItLogo className="error-logo" />
        <h1>We could not load this workspace</h1>
        <p>Please try again. Your data has not been changed.</p>
        <button type="button" onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
