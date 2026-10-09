import { describe, expect, it } from "vitest";
import { isUrgent } from "@gacha/shared";

const H = 3_600_000;
const now = Date.parse("2026-10-09T12:00:00Z");
const at = (hours: number) => new Date(now + hours * H).toISOString();

// VISUAL-DESIGN.md §7: a banner, event or pass ending within 48 hours, or a daily reset within 3 hours.
describe("isUrgent", () => {
  it("flags deadlines within 48 hours", () => {
    expect(isUrgent(at(1), "deadline", now)).toBe(true);
    expect(isUrgent(at(48), "deadline", now)).toBe(true);
    expect(isUrgent(new Date(now + 48 * H + 1), "deadline", now)).toBe(false);
    expect(isUrgent(at(72), "deadline", now)).toBe(false);
  });

  it("flags a daily reset within 3 hours", () => {
    expect(isUrgent(at(2.5), "reset", now)).toBe(true);
    expect(isUrgent(at(3), "reset", now)).toBe(true);
    expect(isUrgent(at(4), "reset", now)).toBe(false);
  });

  it("never flags what has already passed", () => {
    expect(isUrgent(at(-1), "deadline", now)).toBe(false);
    expect(isUrgent(at(-0.5), "reset", now)).toBe(false);
  });
});
