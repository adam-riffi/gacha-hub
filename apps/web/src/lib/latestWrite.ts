import { useEffect, useState } from "react";

/** This page load's id (getRandomValues works on plain http too, for a self-hosted LAN) and a count of its picks. */
const PAGE_ID = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, "0")).join("");
let picks = 0;

/** A pick's order on this page, sent with its save: the server keeps the page's latest pick whatever order the saves land in. */
export const nextWriteOrder = () => ({ page: PAGE_ID, seq: ++picks });

/**
 * Saves of a value picked again and again (card stats: three quick picks), one at a time per key and only the latest waiting: picks
 * sent together could land out of order and keep an older one, and a queue of every pick lost its tail when the page was left
 * (main's CI after #313). What still waits when the page is left goes at once; writes are keepalive, so they outlive the page.
 * The save in flight then can still land after it and is not called back (#345's CI): each save carries its pick's order
 * (`nextWriteOrder`), and the server drops a pick older than the last it applied from the page.
 */
export class LatestWriteQueue<Value> {
  private readonly writesInFlight = new Set<string>();
  private readonly latestWaiting = new Map<string, Value>();

  constructor(
    private readonly write: (key: string, value: Value) => Promise<unknown>,
    private readonly onAllSaved: (key: string) => void,
  ) {}

  /** Saves a key's value now, or after the save in flight, replacing any value still waiting. */
  push(key: string, value: Value): void {
    if (this.writesInFlight.has(key)) {
      this.latestWaiting.set(key, value);
      return;
    }
    this.start(key, value);
  }

  /** Sends every value still waiting at once (the page is being left). */
  flushWaiting(): void {
    for (const [key, value] of this.latestWaiting) void this.write(key, value).catch(() => undefined);
    this.latestWaiting.clear();
  }

  private start(key: string, value: Value): void {
    this.writesInFlight.add(key);
    void this.write(key, value)
      .catch(() => undefined)
      .finally(() => {
        this.writesInFlight.delete(key);
        const waiting = this.latestWaiting.get(key);
        this.latestWaiting.delete(key);
        if (waiting !== undefined) this.start(key, waiting);
        else this.onAllSaved(key);
      });
  }
}

/** One queue for a component, flushed when the page is hidden or left. */
export function useLatestWriteQueue<Value>(write: (key: string, value: Value) => Promise<unknown>, onAllSaved: (key: string) => void): LatestWriteQueue<Value> {
  const [queue] = useState(() => new LatestWriteQueue(write, onAllSaved));
  useEffect(() => {
    const flush = () => queue.flushWaiting();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      queue.flushWaiting();
    };
  }, [queue]);
  return queue;
}
