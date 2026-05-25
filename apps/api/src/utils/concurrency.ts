/**
 * Runs async tasks with a maximum number of concurrent executions.
 */
export async function runWithConcurrencyLimit<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  const concurrency = Math.max(1, Math.min(limit, items.length));
  let index = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      if (current !== undefined) {
        await worker(current);
      }
    }
  });
  await Promise.all(runners);
}
