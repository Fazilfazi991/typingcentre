import "server-only";

export const QA_CTA_PATHS = ["/renewals?range=today", "/renewals?range=7d", "/renewals?range=30d"] as const;
export type RouteHealth = {
  path: string;
  state: "available" | "redirect" | "not_found" | "error";
  httpStatus?: number;
  label: string;
};

type FetchImplementation = typeof fetch;

function classify(path: string, status: number): RouteHealth {
  if (status >= 200 && status < 300)
    return { path, state: "available", httpStatus: status, label: `HTTP ${status}` };
  if (status >= 300 && status < 400)
    return { path, state: "redirect", httpStatus: status, label: "Redirect/auth expected" };
  if (status === 404)
    return { path, state: "not_found", httpStatus: status, label: "404" };
  return { path, state: "error", httpStatus: status, label: `HTTP ${status}` };
}

export async function inspectRouteHealth(
  path: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<RouteHealth> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://noteitapp.com").replace(/\/$/, "");
  const initialUrl = new URL(path, `${base}/`);
  try {
    let response = await fetchImplementation(initialUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "NoteIt-Platform-QA/1.0" },
      signal: AbortSignal.timeout(6_000),
    });
    if ([301, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (location) {
        const target = new URL(location, initialUrl);
        if (target.pathname === initialUrl.pathname && target.search === initialUrl.search)
          response = await fetchImplementation(target, {
            method: "GET",
            redirect: "manual",
            headers: { "User-Agent": "NoteIt-Platform-QA/1.0" },
            signal: AbortSignal.timeout(6_000),
          });
      }
    }
    return classify(path, response.status);
  } catch {
    return { path, state: "error", label: "Connection error" };
  }
}
