"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main style={{ padding: 24 }}><h1>Something went wrong</h1><p>Please try again. Your work has not been changed.</p><button onClick={reset}>Try again</button></main>; }
