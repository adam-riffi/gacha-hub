import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { User } from "../generated/prisma/client.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { DomainError } from "../services/domainError.js";
import { createSession, setSessionCookie } from "./sessions.js";

/** Where passkeys are valid: the app's host, and in development the local ports the app is opened on. */
export function relyingParty() {
  const base = new URL(config.appBaseUrl);
  const devOrigins = config.devLoginEnabled ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:3100"] : [];
  return { id: base.hostname, name: "Gacha Hub", origins: [...new Set([base.origin, ...devOrigins])] };
}

const listed = (passkey: { id: string; name: string; createdAt: Date; lastUsedAt: Date | null }) => ({
  id: passkey.id,
  name: passkey.name,
  createdAt: passkey.createdAt.toISOString(),
  lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
});
const transportsOf = (stored: string) => (stored ? (stored.split(",") as AuthenticatorTransport[]) : undefined);

/**
 * The owner's passkeys (ADR 0010): WebAuthn credentials made on a device (Windows Hello, a phone, a security key), each
 * a public key and the authenticator's signature counter. Added once signed in; then a way in.
 */
export class OwnerPasskeys {
  constructor(private readonly user: { id: string; username: string }) {}

  /** The owner's passkeys, newest first. */
  async list() {
    const rows = await prisma.passkey.findMany({ where: { userId: this.user.id }, orderBy: { createdAt: "desc" } });
    return rows.map(listed);
  }

  /** What the browser needs to make a passkey for this app: a resident key (it finds the account by itself), none twice. */
  async registrationOptions() {
    const existing = await prisma.passkey.findMany({ where: { userId: this.user.id }, select: { id: true, transports: true } });
    const relying = relyingParty();
    return generateRegistrationOptions({
      rpName: relying.name,
      rpID: relying.id,
      userName: this.user.username,
      userID: new TextEncoder().encode(this.user.id),
      excludeCredentials: existing.map((passkey) => ({ id: passkey.id, transports: transportsOf(passkey.transports) })),
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    });
  }

  /** Keeps the passkey the browser made, once its answer to the challenge is proven; then the list. */
  async register(response: unknown, name: string, challenge: string) {
    const relying = relyingParty();
    const verification = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge: challenge,
      expectedOrigin: relying.origins,
      expectedRPID: relying.id,
    });
    if (!verification.verified || !verification.registrationInfo) throw new DomainError(400, "passkey_not_verified");
    const { credential } = verification.registrationInfo;
    await prisma.passkey.create({
      data: { id: credential.id, userId: this.user.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, transports: (credential.transports ?? []).join(","), name },
    });
    return this.list();
  }

  /** Removes one of the owner's passkeys; then the list. */
  async remove(passkeyId: string) {
    const removed = await prisma.passkey.deleteMany({ where: { id: passkeyId, userId: this.user.id } });
    if (!removed.count) throw DomainError.notFound();
    return this.list();
  }

  /** What the browser needs to sign in: no account named, the passkey finds it. */
  static signInOptions() {
    return generateAuthenticationOptions({ rpID: relyingParty().id, userVerification: "preferred" });
  }

  /** The account whose passkey answered the challenge; its counter moves on (a cloned authenticator would lag). */
  static async signIn(response: unknown, challenge: string): Promise<User> {
    const answer = response as AuthenticationResponseJSON;
    const passkey = await prisma.passkey.findUnique({ where: { id: String(answer?.id ?? "") }, include: { user: true } });
    if (!passkey) throw new DomainError(401, "unknown_passkey");
    const relying = relyingParty();
    const verification = await verifyAuthenticationResponse({
      response: answer,
      expectedChallenge: challenge,
      expectedOrigin: relying.origins,
      expectedRPID: relying.id,
      credential: { id: passkey.id, publicKey: new Uint8Array(passkey.publicKey), counter: passkey.counter, transports: transportsOf(passkey.transports) },
    });
    if (!verification.verified) throw new DomainError(401, "passkey_not_verified");
    await prisma.passkey.update({ where: { id: passkey.id }, data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() } });
    return passkey.user;
  }
}

const CHALLENGE_COOKIE = "gacha_webauthn";
const CHALLENGE_PATH = "/api/auth/passkeys";
const registerInput = z.object({ response: z.record(z.string(), z.unknown()), name: z.string().trim().min(1).max(60) });
const signInInput = z.object({ response: z.record(z.string(), z.unknown()) });

/** The challenge rides in a signed cookie for five minutes, scoped to the passkey routes. */
function keepChallenge(reply: FastifyReply, challenge: string) {
  reply.setCookie(CHALLENGE_COOKIE, challenge, { path: CHALLENGE_PATH, httpOnly: true, sameSite: "strict", secure: config.cookieSecure, signed: true, maxAge: 300 });
}

/** The challenge this browser was given, used once. */
function takeChallenge(req: FastifyRequest, reply: FastifyReply): string {
  const raw = req.cookies[CHALLENGE_COOKIE];
  reply.clearCookie(CHALLENGE_COOKIE, { path: CHALLENGE_PATH });
  const unsigned = raw ? req.unsignCookie(raw) : null;
  if (!unsigned?.valid || !unsigned.value) throw new DomainError(400, "no_challenge");
  return unsigned.value;
}

/** The passkey routes (ADR 0010): list, add and remove once signed in; sign in with one, ten tries a minute. */
export async function registerPasskeyRoutes(app: FastifyInstance, requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) {
  const ownerOf = (req: FastifyRequest) => new OwnerPasskeys(req.user!);
  const tries = { rateLimit: { max: 10, timeWindow: "1 minute" } };

  app.get("/api/auth/passkeys", { preHandler: requireUser }, async (req) => ownerOf(req).list());

  app.post("/api/auth/passkeys/options", { preHandler: requireUser }, async (req, reply) => {
    const options = await ownerOf(req).registrationOptions();
    keepChallenge(reply, options.challenge);
    return options;
  });

  app.post("/api/auth/passkeys", { preHandler: requireUser }, async (req, reply) => {
    const { response, name } = registerInput.parse(req.body);
    return reply.code(201).send(await ownerOf(req).register(response, name, takeChallenge(req, reply)));
  });

  app.delete<{ Params: { id: string } }>("/api/auth/passkeys/:id", { preHandler: requireUser }, async (req) => ownerOf(req).remove(req.params.id));

  app.post("/api/auth/passkeys/sign-in/options", { config: tries }, async (_req, reply) => {
    const options = await OwnerPasskeys.signInOptions();
    keepChallenge(reply, options.challenge);
    return options;
  });

  app.post("/api/auth/passkeys/sign-in", { config: tries }, async (req, reply) => {
    const { response } = signInInput.parse(req.body);
    const user = await OwnerPasskeys.signIn(response, takeChallenge(req, reply));
    const session = await createSession(user.id);
    setSessionCookie(reply, session.id, session.expiresAt);
    return { user };
  });
}
