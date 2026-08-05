"use client";

const SESSION_KEY = "renewtrack-session";
const STORE_KEY = "renewtrack-store";

/** Demo-only browser storage. Production tenant isolation will be enforced by Supabase RLS, never LocalStorage. */
export const demoStorage = {
  keys: { session: SESSION_KEY, store: STORE_KEY },
  get<T>(key: string): T | undefined { if (typeof window === "undefined") return undefined; const value = window.localStorage.getItem(key); return value ? (JSON.parse(value) as T) : undefined; },
  set<T>(key: string, value: T) { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value)); },
  remove(key: string) { if (typeof window !== "undefined") window.localStorage.removeItem(key); },
  reset() { this.remove(SESSION_KEY); this.remove(STORE_KEY); },
};
