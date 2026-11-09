import { test, expect, mock } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "degoog-repair-test-"));
process.env.DEGOOG_DATA_DIR = directory;
process.env.DEGOOG_SERVER_SETTINGS_FILE = join(directory, "server-settings.json");
process.env.DEGOOG_PLUGIN_SETTINGS_FILE = join(directory, "plugin-settings.json");
writeFileSync(process.env.DEGOOG_SERVER_SETTINGS_FILE, JSON.stringify({
  wizard: false, instanceId: "synthetic-regression", settings: {
    searxCompatEnabled: true, degoogIndexerEnabled: false, proxyEnabled: false,
    blockClientLeaks: true, imageProxyAllowLocal: false,
  },
}));
writeFileSync(process.env.DEGOOG_PLUGIN_SETTINGS_FILE, "{}");

// Offline provider replies exercise the actual Python RPC and native classifier.
const fixtureFetch = async (url: string | URL): Promise<Response> => {
  if (new URL(String(url)).hostname === "www.google.com") {
    return new Response('bootstrap({"cse_token":"synthetic","cselibVersion":"test"});');
  }
  return new Response('_( {"error":{"code":429,"message":"synthetic provider rate limit"}} );');
};
mock.module("/app/src/server/search/engine-context.ts", () => ({
  createSearchEngineContext: () => ({ fetch: fixtureFetch, lang: "en" }),
}));
const { initEngines } = await import("/app/src/server/extensions/engines/loader.ts");
const { searchSingleEngine } = await import("/app/src/server/search/index.ts");
const { searchAvailability } = await import("/app/src/shared/search-availability.ts");
await initEngines();

test("HTTP 200 with a provider 429 payload is classified as rate limited", async () => {
  const run = await searchSingleEngine("searx-google_cse-engine", "synthetic regression", 1, "any", "en");
  expect(run.results).toEqual([]);
  expect(run.timing.status).toBe("rate_limited");
  expect(run.timing.errorReason).toBe("The search provider is temporarily limiting requests.");
  // The transport was HTTP 200; do not misreport a literal HTTP 429.
  expect(run.timing.httpStatus).toBeUndefined();
});

test("failure copy preserves successful-provider attribution and both languages", () => {
  const runs = [
    { name: "Google Cse", status: "rate_limited", time: 0, resultCount: 0 },
    { name: "Mwmbl", status: "ok", time: 0, resultCount: 2 },
  ];
  expect(searchAvailability(runs, true, "en")).toContain("other selected providers");
  expect(searchAvailability(runs, true, "en")).toContain("temporarily rate limited");
  expect(searchAvailability(runs, true, "en")).not.toContain("unavailable: Google Cse, Mwmbl");
  expect(searchAvailability(runs, false, "es-GT")).toContain("Probá más tarde");
  expect(searchAvailability([runs[1]], false, "en")).toBe("");
});
