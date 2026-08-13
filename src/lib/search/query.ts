export function normalizeSearchTerm(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function postgrestSearchPattern(value: string) {
  const safe = value.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
  return `%${safe}%`;
}
