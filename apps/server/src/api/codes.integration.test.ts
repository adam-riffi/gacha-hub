import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { installGame, login, makeApp, resetDb, type Client } from "../test/helpers.js";
import { resetCodesCache } from "../lib/redeemCodes.js";

type GameCodes = { available: boolean; codes: { code: string; rewards: string; redeemed: boolean; redeemUrl: string | null }[] };

// Georges, round 11: "the philosophy for this whole project is so that I don't need to go around X websites to check my data";
// the codes sites are the first of them.
describe("each game's redeem codes, and which you redeemed (routes)", () => {
  let app: FastifyInstance;
  let client: Client;
  let genshinId: string;
  let askedUrls: string[] = [];
  let upstreamStatus = 200;

  beforeAll(async () => {
    app = await makeApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    resetCodesCache();
    client = await login(app);
    genshinId = await installGame(client, "genshin");
    askedUrls = [];
    upstreamStatus = 200;
    vi.stubGlobal("fetch", async (url: string) => {
      askedUrls.push(url);
      return {
        ok: upstreamStatus === 200,
        status: upstreamStatus,
        json: async () => ({
          codes: [
            { id: 2, code: "GENSHINGIFT", status: "OK", game: "genshin", rewards: "Primogem*50;Mora*10000" },
            { id: 1, code: "OLDCODE", status: "NOT_OK", game: "genshin", rewards: "Primogem*30" },
          ],
        }),
      };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const codes = (instanceId: string) => client.req<GameCodes>("GET", `/api/instances/${instanceId}/codes`);

  it("lists the game's working codes with their rewards and the official page to redeem them, none redeemed yet", async () => {
    const response = await codes(genshinId);
    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      available: true,
      codes: [{ code: "GENSHINGIFT", rewards: "Primogem ×50 · Mora ×10000", redeemed: false, redeemUrl: "https://genshin.hoyoverse.com/en/gift?code=GENSHINGIFT" }],
    });
    expect(askedUrls).toEqual(["https://hoyo-codes.seria.moe/codes?game=genshin"]);
  });

  it("remembers a code you redeemed, until you untick it", async () => {
    expect((await client.req("PUT", `/api/instances/${genshinId}/codes/GENSHINGIFT`, { redeemed: true })).status).toBe(200);
    expect((await codes(genshinId)).json.codes[0]!.redeemed).toBe(true);
    await client.req("PUT", `/api/instances/${genshinId}/codes/GENSHINGIFT`, { redeemed: false });
    expect((await codes(genshinId)).json.codes[0]!.redeemed).toBe(false);
  });

  it("asks the source once an hour, not on every visit", async () => {
    await codes(genshinId);
    await codes(genshinId);
    expect(askedUrls).toHaveLength(1);
  });

  it("says when the source is down, and that a game has no source", async () => {
    upstreamStatus = 503;
    expect((await codes(genshinId)).json).toEqual({ available: false, codes: [] });
    const wuwaId = await installGame(client, "wuwa");
    expect((await codes(wuwaId)).json).toEqual({ available: false, codes: [] });
  });
});
