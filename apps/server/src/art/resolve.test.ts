import { describe, expect, it, vi } from "vitest";
import { resolveWikiFiles, wikiFile } from "./resolve.js";

// Round 22: a wiki's `Special:FilePath` address answers a browser with 403, its direct static address with the picture.
// The slots' sources are resolved through each wiki's API, fifty titles a call, so the web can show them while the store
// is empty.
const page = (title: string, url: string) => ({ ns: 6, title, imageinfo: [{ url }] });
const answer = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("wikiFile", () => {
  it("reads the wiki and the file title out of a Special:FilePath address, decoded, and nothing out of other addresses", () => {
    expect(wikiFile("https://genshin-impact.fandom.com/wiki/Special:FilePath/Splashscreen_A_Rekviem_for_the_Underworld.png")).toEqual({ wiki: "https://genshin-impact.fandom.com", title: "File:Splashscreen_A_Rekviem_for_the_Underworld.png" });
    expect(wikiFile("https://endfield.wiki.gg/wiki/Special:FilePath/Item_Eureka%27s_Teabox.png")).toEqual({ wiki: "https://endfield.wiki.gg", title: "File:Item_Eureka's_Teabox.png" });
    expect(wikiFile("https://is1-ssl.mzstatic.com/image/thumb/x/512x512bb.jpg")).toBeNull();
  });
});

describe("resolveWikiFiles", () => {
  it("asks each wiki once per fifty titles and maps every address to its direct one, through the API's normalised titles", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      const titles = decodeURIComponent(new URL(url).searchParams.get("titles") ?? "").split("|");
      const pages: Record<string, unknown> = {};
      const normalized: { from: string; to: string }[] = [];
      titles.forEach((title, index) => {
        const spaced = title.replace(/_/g, " ");
        if (spaced !== title) normalized.push({ from: title, to: spaced });
        pages[String(index + 1)] = page(spaced, `https://static.example/${index}/${title.slice(5)}`);
      });
      return answer({ query: { normalized, pages } });
    });
    const genshin = Array.from({ length: 60 }, (_, i) => `https://genshin-impact.fandom.com/wiki/Special:FilePath/File_${i}.png`);
    const endfield = ["https://endfield.wiki.gg/wiki/Special:FilePath/Item_Eureka%27s_Teabox.png"];
    const other = ["https://is1-ssl.mzstatic.com/image/thumb/x/512x512bb.jpg"];
    const map = await resolveWikiFiles([...genshin, ...endfield, ...other], fetchImpl);
    expect(calls).toHaveLength(3); // two calls for Genshin's sixty, one for Endfield's
    expect(calls.every((url) => url.includes("action=query") && url.includes("prop=imageinfo") && url.includes("iiprop=url"))).toBe(true);
    expect(map.get(genshin[0]!)).toBe("https://static.example/0/File_0.png");
    expect(map.get(genshin[59]!)).toMatch(/\/File_59\.png$/);
    expect(map.get(endfield[0]!)).toBe("https://static.example/0/Item_Eureka's_Teabox.png");
    expect(map.has(other[0]!)).toBe(false);
  });

  it("leaves out what a wiki does not answer, and a wiki that fails", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith("https://endfield.wiki.gg/")) throw new Error("ECONNRESET");
      return answer({ query: { pages: { "-1": { ns: 6, title: "File:Missing.png", missing: "" }, "7": page("File:Here.png", "https://static.example/here.png") } } });
    });
    const map = await resolveWikiFiles(["https://genshin-impact.fandom.com/wiki/Special:FilePath/Missing.png", "https://genshin-impact.fandom.com/wiki/Special:FilePath/Here.png", "https://endfield.wiki.gg/wiki/Special:FilePath/Gone.png"], fetchImpl);
    expect([...map.entries()]).toEqual([["https://genshin-impact.fandom.com/wiki/Special:FilePath/Here.png", "https://static.example/here.png"]]);
  });
});
