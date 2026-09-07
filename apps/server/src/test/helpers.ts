import { sign, type KeyObject } from "node:crypto";
import { expect } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

/** Build a fresh app instance for a test file (close it in afterAll). */
export async function makeApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

/**
 * Empty every table, children first, so each test starts from a clean slate.
 * Cheap on SQLite and keeps tests order-independent.
 */
export async function resetDb() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.reminderLog.deleteMany(),
    prisma.reminderRule.deleteMany(),
    prisma.task.deleteMany(),
    prisma.materialStock.deleteMany(),
    prisma.ownership.deleteMany(),
    prisma.character.deleteMany(),
    prisma.currencyState.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.event.deleteMany(),
    prisma.gameInstance.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export interface Client {
  cookie: string;
  req: <T = unknown>(
    method: string,
    url: string,
    body?: unknown,
  ) => Promise<{ status: number; json: T }>;
}

/**
 * Dev-login and return a client that carries the session cookie. Pass a
 * distinct `ip` when a test must not share a rate-limit bucket with others.
 */
export async function login(app: FastifyInstance, ip?: string): Promise<Client> {
  const res = await app.inject({ method: "POST", url: "/api/auth/dev-login", remoteAddress: ip });
  const raw = res.headers["set-cookie"];
  const setCookie = Array.isArray(raw) ? raw[0] : raw;
  const cookie = (setCookie ?? "").split(";")[0] ?? "";
  return {
    cookie,
    async req(method, url, body) {
      const r = await app.inject({
        method: method as "GET",
        url,
        remoteAddress: ip,
        headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        payload: body === undefined ? undefined : JSON.stringify(body),
      });
      let json: unknown;
      try {
        json = r.body ? JSON.parse(r.body) : undefined;
      } catch {
        json = r.body;
      }
      return { status: r.statusCode, json: json as never };
    },
  };
}

/** Install a game and return its instance id (201 new, 200 already installed). */
export async function installGame(c: Client, gameKey: string): Promise<string> {
  const r = await c.req<{ id: string }>("POST", "/api/instances", { gameKey });
  expect([200, 201], JSON.stringify(r.json)).toContain(r.status);
  return r.json.id;
}

/** POST a signed Discord interaction to the interactions endpoint. */
export async function interaction(app: FastifyInstance, payload: unknown) {
  const key = (globalThis as { __discordPrivateKey?: KeyObject }).__discordPrivateKey!;
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sigHex = sign(null, Buffer.from(ts + body), key).toString("hex");
  const r = await app.inject({
    method: "POST",
    url: "/api/discord/interactions",
    headers: { "content-type": "application/json", "x-signature-ed25519": sigHex, "x-signature-timestamp": ts },
    payload: body,
  });
  return { status: r.statusCode, json: r.body ? JSON.parse(r.body) : undefined };
}

/** Build a slash-command interaction body. */
export function slash(name: string, options: Record<string, string | number | boolean> = {}) {
  return {
    type: 2,
    data: {
      name,
      options: Object.entries(options).map(([n, v]) => ({
        name: n,
        type: typeof v === "boolean" ? 5 : typeof v === "number" ? 10 : 3,
        value: v,
      })),
    },
    member: { user: { id: "dev-local-user" } },
  };
}
