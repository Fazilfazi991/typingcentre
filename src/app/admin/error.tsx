"use client";
export default function AdminError({ reset }: { error: Error; reset: () => void }) { return <section className="admin-page-error" role="alert"><p>Platform admin</p><h1>We couldn’t load this page</h1><span>The platform console is still available. Please try again.</span><button type="button" onClick={reset}>Retry</button></section>; }
