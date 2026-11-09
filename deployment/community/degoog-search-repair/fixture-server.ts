// Disposable candidate only. The Docker test network has no external route.
// No production request, settings, or user data is loaded by this fixture.
const brave = await Bun.file("/fixtures/brave-fixture.html").text();
const fixtureFetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === "www.google.com") {
    return new Response('bootstrap({"cse_token":"synthetic","cselibVersion":"test"});');
  }
  if (url.hostname === "cse.google.com") {
    return new Response('_( {"error":{"code":429,"message":"synthetic provider rate limit"}} );');
  }
  if (url.hostname === "search.brave.com") {
    return url.searchParams.get("q") === "fixture-empty"
      ? new Response("Synthetic upstream rate limit", { status: 429 })
      : new Response(brave);
  }
  if (url.hostname === "api.mwmbl.org") {
    return Response.json([]);
  }
  if (url.hostname === "imgs.search.brave.com") {
    // Local blank GIF, never fetch or render third-party scripts.
    return new Response(Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0)), { headers: { "Content-Type": "image/gif" } });
  }
  throw new Error("Fixture denied external fetch");
};
globalThis.fetch = fixtureFetch;
const { FetchTransport } = await import("/app/src/server/extensions/transports/builtins/fetch/index.ts");
FetchTransport.prototype.fetch = fixtureFetch;
await import("/app/src/server/index.ts");
