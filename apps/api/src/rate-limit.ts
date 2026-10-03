type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private lastSweep = 0;

  take(key: string, limit: number, windowMs: number, now = Date.now()) {
    if (now - this.lastSweep >= 60000) {
      for (const [id, bucket] of this.buckets)
        if (bucket.resetAt <= now) this.buckets.delete(id);
      this.lastSweep = now;
    }
    const previous = this.buckets.get(key);
    if (!previous || previous.resetAt <= now) {
      // Fail closed instead of retaining unbounded attacker-controlled IP keys.
      if (this.buckets.size >= 20000) return { allowed: false, retryAfter: 60 };
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (previous.count >= limit)
      return {
        allowed: false,
        retryAfter: Math.ceil((previous.resetAt - now) / 1000),
      };
    previous.count++;
    return { allowed: true, retryAfter: 0 };
  }
}
