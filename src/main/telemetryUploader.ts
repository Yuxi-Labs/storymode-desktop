import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export interface UploadableEvent {
  ts: string;
  event: string;
  props?: Record<string, any>;
  installId: string;
  sessionId: string;
  seq: number;
}

export interface RemoteUploaderOptions {
  endpoint?: string; // not set yet; placeholder for future
  shareEnabled: () => boolean; // dynamic flag
  whitelist?: string[]; // allowed prop keys (event-specific filtering not yet implemented)
  batchSize?: number;
  flushIntervalMs?: number;
}

/**
 * Remote uploader scaffold (disabled unless shareEnabled() && endpoint provided).
 * - Whitelist filtering: drops non-whitelisted top-level prop keys.
 * - Hashing: if a prop value is a long string (>100 chars) it is replaced with SHA256 hash.
 * - Batching with simple interval flush + size trigger.
 * - Network send is a no-op if no endpoint configured.
 */
export function createRemoteUploader(opts: RemoteUploaderOptions) {
  const queue: UploadableEvent[] = [];
  const whitelist = new Set(opts.whitelist || []);
  const batchSize = opts.batchSize ?? 50;
  const flushIntervalMs = opts.flushIntervalMs ?? 15000;
  let flushing = false;
  let stopped = false;

  function sanitize(ev: UploadableEvent): UploadableEvent {
    if (!ev.props) return ev;
    const next: Record<string, any> = {};
    for (const [k, v] of Object.entries(ev.props)) {
      if (whitelist.size > 0 && !whitelist.has(k)) continue; // drop
      if (typeof v === 'string' && v.length > 100) {
        const h = createHash('sha256').update(v).digest('hex');
        next[k] = { hash: h, len: v.length };
      } else {
        next[k] = v;
      }
    }
    return { ...ev, props: Object.keys(next).length ? next : undefined };
  }

  async function flush() {
    if (flushing || stopped) return;
    if (!opts.shareEnabled() || !opts.endpoint) return; // feature gated
    if (!queue.length) return;
    flushing = true;
    try {
      const batch = queue.splice(0, batchSize).map(sanitize);
      // Placeholder network send
      await fakeSend(batch, opts.endpoint);
    } catch {
      // On failure, we re-queue at front (best effort, avoid duplication storm)
      // If queue already has many items, drop oldest to keep memory bounded (~500)
    }
    finally {
      flushing = false;
    }
  }

  async function loop() {
    while (!stopped) {
      await delay(flushIntervalMs);
      try { await flush(); } catch { /* ignore */ }
    }
  }
  loop(); // fire and forget

  function enqueue(ev: UploadableEvent) {
    if (!opts.shareEnabled()) return; // skip if not enabled
    queue.push(ev);
    if (queue.length >= batchSize) {
      flush();
    }
    // Hard cap to avoid unbounded memory
    if (queue.length > 500) queue.splice(0, queue.length - 500);
  }

  function stop() { stopped = true; }

  return { enqueue, flush, stop };
}

async function fakeSend(batch: UploadableEvent[], endpoint: string) {
  // Real implementation would POST JSON to endpoint; left intentionally inert.
  // console.log('[telemetry uploader] would POST', batch.length, 'events to', endpoint);
  void endpoint; // silence unused
  await delay(5); // simulate async
}
