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
    prisma.importRun.deleteMany(),
    prisma.linkedAccount.deleteMany(),
    prisma.pullEntry.deleteMany(),
    prisma.cycleResult.deleteMany(),
    prisma.passState.deleteMany(),
    prisma.dayRecord.deleteMany(),
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
export async function login(app: FastifyInstance, ipAddress?: string): Promise<Client> {
  const loginResponse = await app.inject({ method: "POST", url: "/api/auth/dev-login", remoteAddress: ipAddress });
  const raw = loginResponse.headers["set-cookie"];
  const setCookie = Array.isArray(raw) ? raw[0] : raw;
  const cookie = (setCookie ?? "").split(";")[0] ?? "";
  return {
    cookie,
    async req(method, url, body) {
      const response = await app.inject({
        method: method as "GET",
        url,
        remoteAddress: ipAddress,
        headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        payload: body === undefined ? undefined : JSON.stringify(body),
      });
      let json: unknown;
      try {
        json = response.body ? JSON.parse(response.body) : undefined;
      } catch {
        json = response.body;
      }
      return { status: response.statusCode, json: json as never };
    },
  };
}

/** Install a game and return its instance id (201 new, 200 already installed). */
export async function installGame(client: Client, gameKey: string): Promise<string> {
  const response = await client.req<{ id: string }>("POST", "/api/instances", { gameKey });
  expect([200, 201], JSON.stringify(response.json)).toContain(response.status);
  return response.json.id;
}

/** POST a signed Discord interaction to the interactions endpoint. */
export async function interaction(app: FastifyInstance, payload: unknown) {
  const key = (globalThis as { __discordPrivateKey?: KeyObject }).__discordPrivateKey!;
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sigHex = sign(null, Buffer.from(timestamp + body), key).toString("hex");
  const response = await app.inject({
    method: "POST",
    url: "/api/discord/interactions",
    headers: { "content-type": "application/json", "x-signature-ed25519": sigHex, "x-signature-timestamp": timestamp },
    payload: body,
  });
  return { status: response.statusCode, json: response.body ? JSON.parse(response.body) : undefined };
}

/** Build a slash-command interaction body. */
export function slash(name: string, options: Record<string, string | number | boolean> = {}) {
  return {
    type: 2,
    data: {
      name,
      options: Object.entries(options).map(([optionName, optionValue]) => ({
        name: optionName,
        type: typeof optionValue === "boolean" ? 5 : typeof optionValue === "number" ? 10 : 3,
        value: optionValue,
      })),
    },
    member: { user: { id: "dev-local-user" } },
  };
}
