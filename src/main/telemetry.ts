import { app } from 'electron';
import { mkdir, readFile, writeFile, appendFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface TelemetryEvent {
  ts: string; // ISO timestamp
  event: string;
  props?: Record<string, any>;
  installId: string;
  sessionId: string;
  seq: number;
}

interface TelemetryRecorder {
  track: (event: string, props?: Record<string, any>) => void;
  getInstallId: () => string;
  _injectRemote?: (uploader: { enqueue: (ev: TelemetryEvent) => void }) => void;
}

/** Simple JSONL telemetry logger (local only). Rotates at ~1MB. */
export async function initTelemetry(): Promise<TelemetryRecorder> {
  const baseDir = path.join(app.getPath('userData'), 'telemetry');
  await mkdir(baseDir, { recursive: true });
  const installFile = path.join(baseDir, 'installation.json');
  let installId: string;
  try {
    const raw = await readFile(installFile, 'utf8');
    installId = JSON.parse(raw).id || randomUUID();
  } catch {
    installId = randomUUID();
    try { await writeFile(installFile, JSON.stringify({ id: installId }, null, 2), 'utf8'); } catch { /* ignore */ }
  }
  const sessionId = randomUUID();
  let seq = 0;
  const logPath = path.join(baseDir, 'events.log');

  async function rotateIfNeeded() {
    try {
      const s = await stat(logPath);
      if (s.size > 1_000_000) { // 1 MB
        const rotated = path.join(baseDir, `events-${Date.now()}.log`);
        // naive rotate: read then write; simpler than rename (rename fine too)
        // We'll just rename for efficiency
        try { await (await import('node:fs/promises')).rename(logPath, rotated); } catch { /* ignore */ }
      }
    } catch { /* file may not exist yet */ }
  }

  let remote: { enqueue: (ev: TelemetryEvent) => void } | undefined;
  const track = (event: string, props?: Record<string, any>) => {
    const record: TelemetryEvent = {
      ts: new Date().toISOString(),
      event,
      props,
      installId,
      sessionId,
      seq: ++seq,
    };
    const line = JSON.stringify(record) + '\n';
    appendFile(logPath, line).then(rotateIfNeeded).catch(() => {});
    try { remote?.enqueue(record); } catch { /* ignore remote errors */ }
  };

  track('app.session.start', { version: app.getVersion(), locale: app.getLocale?.() });
  try {
    const cpus = os.cpus?.() || [];
    track('env.snapshot', {
      platform: process.platform,
      arch: process.arch,
      cpuCount: cpus.length || undefined,
      cpuModel: cpus[0]?.model?.slice(0,120),
      memMB: Math.round(os.totalmem()/1024/1024),
    });
  } catch { /* ignore env snapshot errors */ }

  return { track, getInstallId: () => installId, _injectRemote: (u) => { remote = u; } };
}
