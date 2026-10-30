export async function mapWithConcurrency(items, concurrency, mapper, signal) {
  const results = new Array(items.length);
  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  let nextIndex = 0;
  let stopped = false;

  const workers = Array.from({ length: workerCount }, async () => {
    while (!stopped && nextIndex < items.length) {
      if (signal?.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");

      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        stopped = true;
        throw error;
      }
    }
  });

  await Promise.all(workers);
  return results;
}
