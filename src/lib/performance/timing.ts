const enabled = () => process.env.NODE_ENV !== "production" || process.env.PERF_TIMINGS === "1";

export async function measureAsync<T>(operation: string, work: () => PromiseLike<T>): Promise<T> {
  const started = performance.now();
  try {
    return await work();
  } finally {
    if (enabled()) process.stdout.write(`[perf] ${operation} ${Math.round(performance.now() - started)}ms\n`);
  }
}
