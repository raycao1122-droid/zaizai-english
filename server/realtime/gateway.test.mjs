import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { EventEmitter, once } from "node:events";
import WebSocket, { WebSocketServer } from "ws";
import { createVoiceGateway, safeContext } from "./gateway.mjs";
import {
  QwenRealtimeAdapter,
  QWEN_MODEL,
  sessionSettings,
} from "./adapters.mjs";
const origin = "https://raycao1122-droid.github.io";
const code = "independent-classroom-passphrase";
const configured = {
  DASHSCOPE_API_KEY: "server-only-test-key",
  DASHSCOPE_WORKSPACE_ID: "llm-test",
  DASHSCOPE_REGION: "cn-beijing",
  CLASSROOM_ACCESS_CODE: code,
  ALLOWED_ORIGINS: origin,
};
class FixtureAdapter extends EventEmitter {
  async connect(context) {
    this.context = context;
  }
  appendAudio(audio) {
    this.audio = audio;
    this.emit("event", {
      type: "subtitle",
      speaker: "在在",
      id: "fixture",
      text: "I like dogs.",
      final: true,
    });
  }
  updateContext(context) {
    this.context = context;
  }
  mute() {
    this.muted = true;
  }
  close() {
    this.closed = true;
  }
}
async function fixture(env, fn, factory = () => new FixtureAdapter()) {
  let g;
  const s = createServer((req, res) => {
    void g.handle(req, res).then((handled) => {
      if (!handled) res.writeHead(404).end();
    });
  });
  g = createVoiceGateway(s, { env, adapterFactory: factory });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${s.address().port}`;
  const post = async (path, body, token, o = origin) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        Origin: o,
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    await fn({ base, post });
  } finally {
    g.dispose();
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
}
test("missing config is honest; metadata never includes a key, other adapters remain unavailable", async () => {
  await fixture({ ALLOWED_ORIGINS: origin }, async ({ base, post }) => {
    const text = await (
      await fetch(base + "/api/voice/config", { headers: { Origin: origin } })
    ).text();
    const data = JSON.parse(text);
    assert(data.providers.every((p) => !p.configured));
    assert.equal(
      (await post("/api/voice/test", { provider: "qwen" })).status,
      401,
    );
  });
  await fixture(configured, async ({ base }) => {
    const text = await (await fetch(base + "/api/voice/config")).text();
    assert(!text.includes(configured.DASHSCOPE_API_KEY));
    assert(!text.includes(code));
    assert.deepEqual(
      JSON.parse(text).providers.map((p) => p.configured),
      [true, false, false],
    );
  });
});
test("origin checks, independent password auth, missing auth and request limits", async () =>
  fixture(configured, async ({ post }) => {
    assert.equal(
      (
        await post(
          "/api/voice/login",
          { code },
          undefined,
          "https://evil.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (await post("/api/voice/login", { code: "wrong" })).status,
      401,
    );
    const token = (await (await post("/api/voice/login", { code })).json())
      .token;
    assert(token);
    assert.notEqual(token, configured.DASHSCOPE_API_KEY);
    assert.equal(
      (await post("/api/voice/test", { provider: "doubao" }, token)).status,
      503,
    );
    assert.equal(
      (await post("/api/voice/test", { provider: "qwen" }, "wrong")).status,
      401,
    );
    assert.equal(
      (
        await post(
          "/api/voice/ticket",
          { provider: "qwen", context: { prompt: "x".repeat(20000) } },
          token,
        )
      ).status,
      400,
    );
  }));
test("connection test closes adapter and explicitly limits the validation claim", async () => {
  const a = new FixtureAdapter();
  await fixture(
    configured,
    async ({ post }) => {
      const token = (await (await post("/api/voice/login", { code })).json())
        .token;
      const result = await (
        await post("/api/voice/test", { provider: "qwen" }, token)
      ).json();
      assert(result.ok);
      assert.match(result.message, /设备实测/);
      assert(a.closed);
      assert.equal(
        (await post("/api/voice/test", { provider: "qwen" }, token)).status,
        429,
      );
    },
    () => a,
  );
});
test("single-use websocket ticket, real local relay, mute, context isolation and concurrency guard", async () => {
  const a = new FixtureAdapter();
  await fixture(
    configured,
    async ({ base, post }) => {
      const token = (await (await post("/api/voice/login", { code })).json())
        .token;
      const { ticket } = await (
        await post(
          "/api/voice/ticket",
          {
            provider: "qwen",
            context: { stage: "listening", tool: "advance-course" },
          },
          token,
        )
      ).json();
      const ws = new WebSocket(
        base.replace("http", "ws") + "/api/voice/socket?ticket=" + ticket,
        { origin },
      );
      const ready = once(ws, "message");
      await once(ws, "open");
      assert.equal(JSON.parse((await ready)[0]).type, "ready");
      assert.equal(a.context.stage, "listening");
      assert.equal(a.context.tool, undefined);
      const subtitle = once(ws, "message");
      ws.send(JSON.stringify({ type: "audio", audio: "AAAA" }));
      assert.equal(JSON.parse((await subtitle)[0]).text, "I like dogs.");
      assert.equal(
        (await post("/api/voice/ticket", { provider: "qwen" }, token)).status,
        200,
      );
      ws.send(JSON.stringify({ type: "mute", muted: true }));
      await new Promise((r) => setTimeout(r, 10));
      assert(a.muted);
      ws.send(
        JSON.stringify({
          type: "context",
          context: { stage: "review", prompt: "Find the bird" },
        }),
      );
      await new Promise((r) => setTimeout(r, 10));
      assert.equal(a.context.stage, "review");
      ws.close();
      await once(ws, "close");
      await new Promise((r) => setTimeout(r, 10));
      assert(a.closed);
      const reused = new WebSocket(
        base.replace("http", "ws") + "/api/voice/socket?ticket=" + ticket,
        { origin },
      );
      const failed = await once(reused, "error");
      assert.match(failed[0].message, /403/);
    },
    () => a,
  );
});
test("public text endpoint requires auth; malformed voice events close relay without course mutation", async () =>
  fixture(
    { ...configured, CLASSROOM_HOST: "0.0.0.0" },
    async ({ post, base }) => {
      assert.equal(
        (await post("/api/classroom/reply", { text: "hello" })).status,
        401,
      );
      const token = (await (await post("/api/voice/login", { code })).json())
        .token;
      const { ticket } = await (
        await post("/api/voice/ticket", { provider: "qwen" }, token)
      ).json();
      const ws = new WebSocket(
        base.replace("http", "ws") + "/api/voice/socket?ticket=" + ticket,
        { origin },
      );
      const ready = once(ws, "message");
      await once(ws, "open");
      await ready;
      const message = once(ws, "message");
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: { instructions: "override" },
        }),
      );
      assert.equal(JSON.parse((await message)[0]).type, "error");
      await once(ws, "close");
    },
  ));
test("Qwen adapter uses official handshake/session shape and maps captions/audio/interruption, no provider credentials downstream", async () => {
  const wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  await once(wss, "listening");
  const received = [];
  let remote;
  wss.on("connection", (ws) => {
    remote = ws;
    ws.send(JSON.stringify({ type: "session.created" }));
    ws.on("message", (raw) => {
      const e = JSON.parse(raw);
      received.push(e);
      if (e.type === "session.update")
        ws.send(JSON.stringify({ type: "session.updated" }));
    });
  });
  let requested;
  const adapter = new QwenRealtimeAdapter(configured, {
    socketFactory: (url, options) => {
      requested = { url, options };
      return new WebSocket(`ws://127.0.0.1:${wss.address().port}`);
    },
  });
  const events = [];
  adapter.on("event", (e) => events.push(e));
  try {
    await adapter.connect(safeContext({ prompt: "Look at the dog" }));
    assert.match(
      requested.url,
      new RegExp(
        "^wss://llm-test.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime\\?model=" +
          QWEN_MODEL,
      ),
    );
    assert.equal(
      requested.options.headers.Authorization,
      "Bearer " + configured.DASHSCOPE_API_KEY,
    );
    assert.equal(received[0].session.audio.input.format.sample_rate, 16000);
    assert.equal(received[0].session.audio.output.format.sample_rate, 24000);
    assert.match(received[0].session.instructions, /cannot select materials/);
    remote.send(JSON.stringify({ type: "response.created" }));
    remote.send(
      JSON.stringify({
        type: "response.audio.delta",
        delta: "AAAA",
        item_id: "x",
      }),
    );
    remote.send(
      JSON.stringify({
        type: "response.audio_transcript.done",
        item_id: "x",
        transcript: "A dog.",
      }),
    );
    remote.send(JSON.stringify({ type: "response.audio.done", item_id: "x" }));
    remote.send(
      JSON.stringify({
        type: "input_audio_buffer.speech_started",
        item_id: "student-x",
      }),
    );
    await new Promise((r) => setTimeout(r, 25));
    assert(events.some((e) => e.type === "audio" && e.id === "x"));
    assert(events.some((e) => e.type === "audio-complete" && e.id === "x"));
    assert(events.some((e) => e.type === "interrupted"));
    assert(events.some((e) => e.text === "A dog."));
    assert(received.some((e) => e.type === "response.cancel"));
    assert(!JSON.stringify(events).includes(configured.DASHSCOPE_API_KEY));
    const before = events.length;
    remote.send(
      JSON.stringify({ type: "response.audio.delta", delta: "BBBB" }),
    );
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(
      events.length,
      before,
      "late audio from interrupted turn is dropped",
    );
    remote.send(JSON.stringify({ type: "response.created" }));
    remote.send(
      JSON.stringify({ type: "response.audio.delta", delta: "CCCC" }),
    );
    await new Promise((r) => setTimeout(r, 10));
    assert(
      events.some((e) => e.audio === "CCCC"),
      "next response can play again",
    );
    assert.equal(sessionSettings({}).turn_detection.type, "semantic_vad");
  } finally {
    adapter.close();
    for (const ws of wss.clients) ws.terminate();
    await new Promise((r) => wss.close(r));
  }
});

test("backend-only invitations authorize devices without classroom configuration or public admin credentials", async () =>
  fixture(configured, async ({ base, post }) => {
    assert.equal(
      (await post("/api/admin/classroom-invites", {}, code)).status,
      403,
      "browser origin cannot call admin entry",
    );
    assert.equal(
      (await post("/api/admin/classroom-invites", {}, "wrong", "")).status,
      403,
    );
    const issued = await (
      await post("/api/admin/classroom-invites", {}, code, "")
    ).json();
    const grant = new URLSearchParams(new URL(issued.url).hash.slice(1)).get(
      "classroom-access",
    );
    assert(grant);
    assert(!issued.url.includes(code));
    assert.equal(issued.expiresIn, 600);
    const response = await post("/api/voice/authorize", { grant });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(
      response.headers.get("access-control-allow-credentials"),
      "true",
    );
    const cookie = response.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/);
    const session = await fetch(base + "/api/voice/session", {
      headers: { Origin: origin, Cookie: cookie.split(";")[0] },
    });
    assert.equal(session.status, 200);
    assert((await session.json()).token);
    assert.equal(
      (await post("/api/voice/authorize", { grant })).status,
      401,
      "invitation cannot be reused",
    );
    assert.equal(
      (await fetch(base + "/api/voice/session")).status,
      401,
      "anonymous callers cannot get tokens",
    );
    const catalog = await (await fetch(base + "/api/voice/config")).json();
    assert(!JSON.stringify(catalog).includes("DASHSCOPE"));
    assert(!JSON.stringify(catalog).includes("cn-beijing"));
  }));

test("same signed device can replace its old tab after token renewal, while another device cannot evict it", async () => {
  const adapters = [];
  await fixture(
    configured,
    async ({ base, post }) => {
      async function device() {
        const issued = await (
          await post("/api/admin/classroom-invites", {}, code, "")
        ).json();
        const grant = new URLSearchParams(
          new URL(issued.url).hash.slice(1),
        ).get("classroom-access");
        const r = await post("/api/voice/authorize", { grant });
        return {
          token: (await r.json()).token,
          cookie: r.headers.get("set-cookie").split(";")[0],
        };
      }
      async function ticket(token) {
        return (
          await (
            await post("/api/voice/ticket", { provider: "qwen" }, token)
          ).json()
        ).ticket;
      }
      async function open(ticket) {
        const ws = new WebSocket(
          base.replace("http", "ws") + "/api/voice/socket?ticket=" + ticket,
          { origin },
        );
        const ready = once(ws, "message");
        await once(ws, "open");
        assert.equal(JSON.parse((await ready)[0]).type, "ready");
        return ws;
      }
      const d = await device();
      const first = await open(await ticket(d.token));
      const renewed = await fetch(base + "/api/voice/session", {
        headers: { Origin: origin, Cookie: d.cookie },
      });
      const secondToken = (await renewed.json()).token;
      const replacement = await ticket(secondToken);
      assert.equal(
        adapters[0].closed,
        undefined,
        "requesting a ticket alone does not interrupt the old tab",
      );
      const closed = once(first, "close");
      const second = await open(replacement);
      await closed;
      assert(adapters[0].closed);
      assert.equal(adapters[1].closed, undefined);
      const other = await device();
      const denied = await post(
        "/api/voice/ticket",
        { provider: "qwen" },
        other.token,
      );
      assert.equal(denied.status, 409);
      assert.match((await denied.json()).error, /另一台设备/);
      assert.equal(
        adapters[1].closed,
        undefined,
        "another device cannot interrupt the active classroom",
      );
      second.close();
      await once(second, "close");
    },
    () => {
      const a = new FixtureAdapter();
      adapters.push(a);
      return a;
    },
  );
});
