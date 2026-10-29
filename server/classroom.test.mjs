import { test } from "node:test";
import assert from "node:assert/strict";
import { createClassroomServer } from "./classroom.mjs";
async function fixture(config, fn) {
  const s = createClassroomServer(config);
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  try {
    await fn(`http://127.0.0.1:${s.address().port}`);
  } finally {
    await new Promise((r) => s.close(r));
  }
}
const post = (url, body, origin) =>
  fetch(url + "/api/classroom/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
test("missing key is explicit and never calls a provider", async () =>
  fixture(
    {
      env: {},
      request: () => {
        throw Error("must not call");
      },
    },
    async (url) => {
      assert.equal(
        (await (await fetch(url + "/api/health")).json()).configured,
        false,
      );
      assert.equal(
        (await post(url, { text: "dog", prompt: "Find the dog" })).status,
        503,
      );
    },
  ));
test("rejects invalid inputs and cross-origin requests before provider calls", async () =>
  fixture(
    {
      env: { OPENAI_API_KEY: "test-only" },
      request: () => {
        throw Error("must not call");
      },
    },
    async (url) => {
      assert.equal((await post(url, { text: "", prompt: "" })).status, 400);
      assert.equal(
        (await post(url, { text: "dog", prompt: "" }, "https://other.example"))
          .status,
        403,
      );
    },
  ));
test("maps actual Responses API shape to a text-only response, keeps credentials server side", async () => {
  let called;
  await fixture(
    {
      env: { OPENAI_API_KEY: "test-only" },
      request: async (url, opts) => {
        called = { url, opts };
        return Response.json({
          output: [
            {
              content: [
                { type: "output_text", text: "What animal do you like?" },
              ],
            },
          ],
        });
      },
    },
    async (url) => {
      const r = await post(url, { text: "dog", prompt: "Animals" });
      const result = await r.json();
      assert.equal(result.text, "What animal do you like?");
      assert.equal(result.source, "openai");
      assert.equal(JSON.stringify(result).includes("test-only"), false);
      assert.equal(JSON.parse(called.opts.body).store, false);
      assert.equal(called.url, "https://api.openai.com/v1/responses");
    },
  );
});
test("provider failure produces an error rather than fabricated teaching content", async () =>
  fixture(
    {
      env: { OPENAI_API_KEY: "test-only" },
      request: async () => new Response("provider failure", { status: 429 }),
    },
    async (url) => {
      const r = await post(url, { text: "dog", prompt: "Animals" });
      assert.equal(r.status, 502);
      assert((await r.json()).error.includes("繁忙"));
    },
  ));
