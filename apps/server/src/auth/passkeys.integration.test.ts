import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "../lib/prisma.js";
import { makeApp, resetDb } from "../test/helpers.js";
import { OwnerPasskeys } from "./passkeys.js";

// The signatures themselves are @simplewebauthn's to check (and the passkey journey's, with Chrome's test authenticator);
// here the service around them: what it keeps, whom it signs in, what it refuses.
vi.mock("@simplewebauthn/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@simplewebauthn/server")>()),
  verifyRegistrationResponse: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
}));

const registered = (credentialId: string) =>
  ({ verified: true, registrationInfo: { credential: { id: credentialId, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ["internal", "hybrid"] } } }) as never;

// ADR 0010: the owner's passkeys, added once signed in, then a way in.
describe("OwnerPasskeys", () => {
  let app: FastifyInstance;
  let owner: { id: string; username: string };

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    vi.mocked(verifyRegistrationResponse).mockReset();
    vi.mocked(verifyAuthenticationResponse).mockReset();
    owner = await prisma.user.create({ data: { discordId: "owner", username: "Owner" } });
  });

  it("offers a passkey for this app's host, then keeps the one made, named, never one twice", async () => {
    const options = await new OwnerPasskeys(owner).registrationOptions();
    expect(options.rp.id).toBe("localhost");
    expect(options.user.name).toBe("Owner");
    expect(options.challenge).toBeTruthy();

    vi.mocked(verifyRegistrationResponse).mockResolvedValue(registered("credential-one"));
    const listed = await new OwnerPasskeys(owner).register({ id: "credential-one" }, "This device · 15 Oct", options.challenge);
    expect(listed).toEqual([expect.objectContaining({ id: "credential-one", name: "This device · 15 Oct", lastUsedAt: null })]);
    expect(vi.mocked(verifyRegistrationResponse).mock.calls[0]![0]).toMatchObject({ expectedChallenge: options.challenge, expectedRPID: "localhost" });
    // The next offer excludes the passkeys already made, so a device does not make a second.
    expect((await new OwnerPasskeys(owner).registrationOptions()).excludeCredentials?.map((credential) => credential.id)).toEqual(["credential-one"]);
  });

  it("refuses a passkey the browser could not prove", async () => {
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({ verified: false } as never);
    await expect(new OwnerPasskeys(owner).register({ id: "forged" }, "Forged", "challenge")).rejects.toMatchObject({ statusCode: 400, code: "passkey_not_verified" });
    expect(await new OwnerPasskeys(owner).list()).toEqual([]);
  });

  it("signs its owner in with a known passkey, keeping the authenticator's counter; an unknown one is refused", async () => {
    vi.mocked(verifyRegistrationResponse).mockResolvedValue(registered("credential-one"));
    await new OwnerPasskeys(owner).register({ id: "credential-one" }, "Phone", "challenge");

    await expect(OwnerPasskeys.signIn({ id: "someone-else" }, "challenge")).rejects.toMatchObject({ statusCode: 401, code: "unknown_passkey" });
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 7 } } as never);
    expect((await OwnerPasskeys.signIn({ id: "credential-one" }, "challenge")).id).toBe(owner.id);
    const [passkey] = await new OwnerPasskeys(owner).list();
    expect(passkey!.lastUsedAt).not.toBeNull();
    expect((await prisma.passkey.findUniqueOrThrow({ where: { id: "credential-one" } })).counter).toBe(7);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({ verified: false } as never);
    await expect(OwnerPasskeys.signIn({ id: "credential-one" }, "challenge")).rejects.toMatchObject({ statusCode: 401, code: "passkey_not_verified" });
  });

  it("removes the owner's own passkeys only", async () => {
    vi.mocked(verifyRegistrationResponse).mockResolvedValue(registered("credential-one"));
    await new OwnerPasskeys(owner).register({ id: "credential-one" }, "Phone", "challenge");
    const stranger = await prisma.user.create({ data: { discordId: "stranger", username: "Stranger" } });
    await expect(new OwnerPasskeys(stranger).remove("credential-one")).rejects.toMatchObject({ statusCode: 404, code: "not_found" });
    expect(await new OwnerPasskeys(owner).remove("credential-one")).toEqual([]);
  });

  it("tells the sign-in page a passkey works once one exists, and needs a challenge from this browser to sign in", async () => {
    expect((await app.inject({ method: "GET", url: "/api/me" })).json().passkeySignIn).toBe(false);
    vi.mocked(verifyRegistrationResponse).mockResolvedValue(registered("credential-one"));
    await new OwnerPasskeys(owner).register({ id: "credential-one" }, "Phone", "challenge");
    expect((await app.inject({ method: "GET", url: "/api/me" })).json().passkeySignIn).toBe(true);

    const options = await app.inject({ method: "POST", url: "/api/auth/passkeys/sign-in/options", remoteAddress: "10.0.1.1" });
    expect(options.statusCode).toBe(200);
    expect(String(options.headers["set-cookie"])).toContain("gacha_webauthn=");
    const withoutChallenge = await app.inject({ method: "POST", url: "/api/auth/passkeys/sign-in", payload: { response: { id: "credential-one" } }, remoteAddress: "10.0.1.1" });
    expect(withoutChallenge.statusCode).toBe(400);
    expect(withoutChallenge.json()).toEqual({ error: "no_challenge" });
    // Adding one needs to be signed in.
    expect((await app.inject({ method: "POST", url: "/api/auth/passkeys/options" })).statusCode).toBe(401);
  });
});
