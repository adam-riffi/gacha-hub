import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { makeApp } from "../test/helpers.js";

// A deployment's smoke check needs one anonymous read that goes through the
// database, so a broken connection (the pooler, the adapter) fails the check
// instead of hiding behind routes that never reach the database.
describe("GET /api/health", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("answers anonymously once the database answers", async () => {
    const r = await app.inject({ method: "GET", url: "/api/health" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true, database: "ok" });
    expect(r.headers["cache-control"]).toBe("no-store");
  });
});
