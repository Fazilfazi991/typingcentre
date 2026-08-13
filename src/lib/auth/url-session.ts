export type SupabaseUrlSession = {
  access_token: string;
  refresh_token: string;
};

/**
 * Reads the credentials supplied by Supabase's implicit recovery flow.
 * Callers must remove the fragment from the browser URL immediately and must
 * never log or transmit these values outside the Supabase client.
 */
export function parseSupabaseSessionHash(hash: string): SupabaseUrlSession | null {
  if (!hash.startsWith("#")) return null;

  const params = new URLSearchParams(hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  return { access_token: accessToken, refresh_token: refreshToken };
}
