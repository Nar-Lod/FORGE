import type { ForgeEvent } from "./forge-analytics";

const QUEUE_KEY = "forge.sync.queue.v1";
const MAX_QUEUE = 5000;

type QueuedEvent = ForgeEvent & { queuedAt: number; attempts: number; nextRetryAt: number };

function read(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function write(events: QueuedEvent[]) {
  if (typeof window !== "undefined") localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
}

export function enqueueForgeEvent(event: ForgeEvent) {
  const events = read();
  if (events.some(e => e.id === event.id)) return;
  events.push({ ...event, queuedAt: Date.now(), attempts: 0, nextRetryAt: 0 });
  write(events);
}

export function getPendingForgeEvents() {
  return read();
}

let flushing = false;

let authToken: string | null = null;

export function setForgeSyncToken(token: string | null) { authToken = token; }

export async function flushForgeEventQueue(token?: string | null) {
  if (flushing || typeof window === "undefined" || !navigator.onLine) return { sent: 0, pending: read().length };
  flushing = true;
  let sent = 0;
  try {
    const bearer = token ?? authToken;
    if (!bearer) return { sent: 0, pending: read().length };

    let queue = read();
    for (const item of queue.slice()) {
      if (item.nextRetryAt > Date.now()) continue;
      try {
        const response = await fetch("/api/forge/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearer}`,
          },
          body: JSON.stringify(item),
          keepalive: true,
        });
        if (!response.ok) throw new Error(`sync_${response.status}`);
        queue = queue.filter(e => e.id !== item.id);
        sent++;
        write(queue);
      } catch {
        const attempts = item.attempts + 1;
        const delay = Math.min(5 * 60_000, 1000 * 2 ** Math.min(attempts, 8));
        queue = queue.map(e => e.id === item.id
          ? { ...e, attempts, nextRetryAt: Date.now() + delay }
          : e);
        write(queue);
      }
    }
    return { sent, pending: queue.length };
  } finally { flushing = false; }
}

export function installForgeSyncListeners() {
  if (typeof window === "undefined") return () => {};
  const flush = () => void flushForgeEventQueue();
  window.addEventListener("online", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flush();
  });
  void flush();
  return () => window.removeEventListener("online", flush);
}
