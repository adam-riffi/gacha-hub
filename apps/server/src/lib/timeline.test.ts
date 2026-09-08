import { describe, expect, it } from "vitest";
import { adminPayloadInput, timedStatus } from "@gacha/shared";
import { exportBanner, exportEvent, formatRemaining, parseTimelineFilter, serializeBanner, timelineWhere } from "./timeline.js";

const now = new Date("2026-09-07T12:00:00Z");
const banner = {
  id: "b1",
  gameKey: "genshin",
  key: "amber-rerun",
  name: "Amber Rerun",
  kind: "character",
  startsAt: new Date("2026-09-01T03:00:00Z"),
  endsAt: new Date("2026-09-21T14:59:00Z"),
  featured: [{ catalogId: "10000021", kind: "character", rateUp: true }],
  payload: { note: "test" },
  version: 2,
  createdAt: now,
  updatedAt: now,
};

describe("timeline", () => {
  it("computes status relative to now", () => {
    expect(timedStatus(banner.startsAt, banner.endsAt, now)).toBe("active");
    expect(timedStatus(banner.startsAt, banner.endsAt, new Date("2026-08-01T00:00:00Z"))).toBe("upcoming");
    expect(timedStatus(banner.startsAt, banner.endsAt, new Date("2026-10-01T00:00:00Z"))).toBe("ended");
    expect(serializeBanner(banner, now).status).toBe("active");
    expect(serializeBanner(banner, now).startsAt).toBe("2026-09-01T03:00:00.000Z");
  });

  it("exports in the upload shape and round-trips through the payload schema", () => {
    const exported = exportBanner(banner);
    expect(exported).toEqual({
      key: "amber-rerun",
      name: "Amber Rerun",
      kind: "character",
      startsAt: "2026-09-01T03:00:00.000Z",
      endsAt: "2026-09-21T14:59:00.000Z",
      featured: [{ catalogId: "10000021", kind: "character", rateUp: true }],
      version: 2,
      payload: { note: "test" },
    });
    const parsed = adminPayloadInput.parse({ kind: "banners", gameKey: "genshin", items: [exported] });
    expect(parsed.kind === "banners" ? parsed.items[0]?.featured[0]?.catalogId : undefined).toBe("10000021");

    const event = exportEvent({
      id: "e1", gameKey: "genshin", key: "lantern-rite", name: "Lantern Rite",
      startsAt: banner.startsAt, endsAt: banner.endsAt, description: null, rewards: [{ label: "Primogems", qty: 1600 }],
      url: null, payload: null, createdAt: now, updatedAt: now,
    });
    expect(event).toEqual({
      key: "lantern-rite", name: "Lantern Rite",
      startsAt: "2026-09-01T03:00:00.000Z", endsAt: "2026-09-21T14:59:00.000Z",
      rewards: [{ label: "Primogems", qty: 1600 }],
    });
    expect(adminPayloadInput.safeParse({ kind: "events", gameKey: "genshin", items: [event] }).success).toBe(true);
  });

  it("rejects bad payloads", () => {
    const bad = adminPayloadInput.safeParse({
      kind: "banners", gameKey: "genshin",
      items: [{ key: "x", name: "X", kind: "character", startsAt: "2026-09-21T00:00:00Z", endsAt: "2026-09-01T00:00:00Z" }],
    });
    expect(bad.success).toBe(false);
    expect(adminPayloadInput.safeParse({ kind: "banners", gameKey: "genshin", items: [] }).success).toBe(false);
    expect(adminPayloadInput.safeParse({ kind: "events", gameKey: "genshin", items: [{ key: "bad key!", name: "X", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-02T00:00:00Z" }] }).success).toBe(false);
  });

  it("maps filters to time windows", () => {
    expect(parseTimelineFilter(undefined)).toBe("current");
    expect(parseTimelineFilter("ended")).toBe("ended");
    expect(parseTimelineFilter("garbage")).toBe("current");
    expect(timelineWhere("active", now)).toEqual({ startsAt: { lte: now }, endsAt: { gt: now } });
    expect(timelineWhere("all", now)).toEqual({});
  });

  it("formats remaining time", () => {
    expect(formatRemaining(new Date(now.getTime() + 3 * 86_400_000 + 4 * 3_600_000), now)).toBe("3d 4h");
    expect(formatRemaining(new Date(now.getTime() + 2 * 3_600_000 + 5 * 60_000), now)).toBe("2h 05m");
    expect(formatRemaining(new Date(now.getTime() + 12 * 60_000), now)).toBe("12m");
    expect(formatRemaining(now, now)).toBe("now");
  });
});
