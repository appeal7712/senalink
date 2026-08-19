const buckets = new Map();

/**
 * Simple per-action client-side rate limiter.
 * Returns true if the action should be BLOCKED.
 */
export function isRateLimited(action, { maxCalls = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let bucket = buckets.get(action);
  if (!bucket) {
    bucket = [];
    buckets.set(action, bucket);
  }
  // purge old entries
  while (bucket.length && bucket[0] <= now - windowMs) bucket.shift();
  if (bucket.length >= maxCalls) return true;
  bucket.push(now);
  return false;
}

/**
 * Throttle helper — returns a wrapper that drops calls within cooldownMs.
 */
export function throttle(fn, cooldownMs = 2000) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last < cooldownMs) return;
    last = now;
    return fn.apply(this, args);
  };
}
