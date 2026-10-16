import test from "node:test";
import assert from "node:assert/strict";
import { createService } from "../src/services/index.js";

function fixture() {
  const calls = [],
    sources = [{ project_id: "p1", release_id: "r1" }];
  let configured = [],
    plans = [],
    jobs = [],
    messages = [],
    version = 0;
  const fetchImpl = async (url, options = {}) => {
    const path = new URL(url, "http://localhost").pathname.replace(
      "/api/v1",
      "",
    );
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, method, body, headers: options.headers });
    let data;
    if (path === "/auth/session")
      data = { user: { id: "u1" }, csrf_token: "csrf" };
    else if (path === "/gemini/sources")
      data = {
        sources: [
          {
            ...sources[0],
            title: "Owned",
            version: "1.0.0",
            stack: "Python",
            derivative_allowed: true,
          },
        ],
        purchased_available: false,
      };
    else if (path === "/gemini/quota")
      data = {
        remaining: 9000,
        allocation: 10000,
        used: 1000,
        reserved: 0,
        unit: "tokens",
      };
    else if (path === "/gemini/conversations" && method === "POST")
      data = { id: "c1", title: body.title, sources: [] };
    else if (path === "/gemini/conversations" && method === "GET")
      data = [{ id: "c1", title: "Build", message_count: messages.length }];
    else if (path === "/gemini/conversations/c1")
      data = {
        id: "c1",
        title: "Build",
        sources: configured,
        plans,
        jobs,
        source_version: version,
      };
    else if (path.endsWith("/sources") && method === "PUT") {
      configured = body.sources;
      version++;
      data = { sources: configured };
    } else if (path.endsWith("/messages") && method === "GET") data = messages;
    else if (path.endsWith("/estimates"))
      data = { id: "e1", analysis_budget: 1000, generation_budget: 2000 };
    else if (path.endsWith("/messages") && method === "POST") {
      assert.deepEqual(Object.keys(body).sort(), ["content", "estimate_id"]);
      messages = [
        { id: "m1", role: "user", content: body.content },
        { id: "m2", role: "assistant", content: "Answer" },
      ];
      version++;
      data = { id: "chat-job", operation: "chat", status: "queued" };
    } else if (path.endsWith("/plans") && method === "POST") {
      assert.equal(body.estimate_id, "e1");
      plans = [
        {
          id: "plan1",
          revision: 1,
          state: "awaiting_confirmation",
          sources,
          source_version: version,
          target_stack: body.target_stack,
          requirements: body.requirements,
          generation_budget: 2000,
          content: {
            text: "Implement search",
            features: ["Search"],
            conflicts: [],
          },
        },
      ];
      data = { id: "plan-job", operation: "plan", status: "queued" };
    } else if (path === "/gemini/plans/plan1/confirm") {
      assert.deepEqual(body, { revision: 1 });
      jobs = [
        {
          id: "gen-job",
          plan_id: "plan1",
          operation: "generate",
          status: "queued",
          validation: {},
        },
      ];
      data = jobs[0];
    } else if (path.startsWith("/jobs/"))
      data = {
        id: path.split("/").at(-1),
        plan_id: "plan1",
        operation: path.includes("gen-job") ? "generate" : "plan",
        status: "succeeded",
        output_id: path.includes("gen-job") ? "o1" : null,
        validation: { build: "not-run" },
      };
    else
      return new Response(
        JSON.stringify({
          error: { code: "NOT_FOUND", message: `${method} ${path}` },
        }),
        { status: 404 },
      );
    return new Response(JSON.stringify({ data }), {
      status: method === "POST" ? 202 : 200,
    });
  };
  const service = createService({ mode: "api", baseUrl: "/api/v1", fetchImpl });
  const input = {
    chatId: "c1",
    sources: [{ projectId: "p1", releaseId: "r1" }],
    stack: "Python",
    instruction: "Add search",
  };
  return { service, calls, input };
}

test("Gemini live adapter lists conversations and authorized sources with quota", async () => {
  const { service } = fixture();
  const chats = await service.call("gemini.list");
  assert.equal(chats[0].id, "c1");
  const data = await service.call("gemini.sources");
  assert.equal(data.sources[0].releaseId, "r1");
  assert.equal(data.quota, 9000);
  assert.equal(data.purchasedAvailable, false);
});

test("Gemini sends exact releases, estimates and chat jobs to the Python contract", async () => {
  const { service, calls, input } = fixture();
  await service.call("auth.session");
  const chat = await service.call("gemini.message", {
    ...input,
    text: "Explain this",
  });
  assert.equal(chat.messages.at(-1).text, "Answer");
  const sent = calls.find(
    (c) => c.method === "POST" && c.path.endsWith("/messages"),
  );
  assert.equal(sent.body.content, "Explain this");
  assert.equal(sent.headers["X-CSRF-Token"], "csrf");
  assert.ok(sent.headers["Idempotency-Key"]);
  assert.deepEqual(calls.find((c) => c.method === "PUT").body.sources, [
    { project_id: "p1", release_id: "r1" },
  ]);
});

test("Gemini plan requires explicit confirmation and restores its generation job", async () => {
  const { service, calls, input } = fixture();
  const p = await service.call("gemini.plan", input);
  assert.equal(p.cost, 2000);
  assert.ok(p.steps.includes("Implement search"));
  assert.deepEqual(p.input, {
    sources: input.sources,
    stack: input.stack,
    instruction: input.instruction,
  });
  assert.equal(
    calls.some((c) => c.path.endsWith("/confirm")),
    false,
  );
  await assert.rejects(
    service.call("gemini.confirm", { ...input, planId: p.id, revision: 1 }),
    /confirmation/i,
  );
  const job = await service.call("gemini.confirm", {
    ...input,
    planId: p.id,
    revision: 1,
    confirmed: true,
  });
  assert.equal(job.status, "queued");
  const restored = await service.call("gemini.get", { chatId: "c1" });
  assert.equal(restored.jobs[0].planId, "plan1");
  assert.equal(
    (await service.call("gemini.job", { jobId: job.id })).output.archiveId,
    "o1",
  );
});

test("URL-only source import fails clearly instead of pretending archive verification", async () => {
  const { service } = fixture();
  await assert.rejects(
    service.call("gemini.import", {
      url: "https://example.com",
      license: "MIT",
    }),
    /ZIP|archive/i,
  );
});

test("failed generation cannot expose its output ZIP", async () => {
  const service = createService({
    mode: "api",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: {
            id: "j",
            status: "failed",
            output_id: "o",
            error: "PROVIDER_UNAVAILABLE",
          },
        }),
      ),
  });
  const job = await service.call("gemini.job", { jobId: "j" });
  assert.equal(job.output, null);
  await assert.rejects(service.call("gemini.download", { jobId: "j" }), {
    code: "OUTPUT_UNAVAILABLE",
  });
});

test("download fetches an authorized binary ZIP rather than navigating to a public URL", async () => {
  const seen = [];
  const { createGeminiApi } = await import("../src/services/gemini-api.js");
  const blob = new Blob(["zip"], { type: "application/zip" });
  let saved;
  const call = createGeminiApi({
    fail: (code, message) => {
      throw Object.assign(new Error(message), { code });
    },
    request: async (path, options) => {
      seen.push({ path, options });
      return path.startsWith("/jobs/")
        ? { id: "j", status: "succeeded", output_id: "o" }
        : blob;
    },
    saveDownload: (data, filename) => {
      saved = { data, filename };
    },
  });
  assert.deepEqual(await call("gemini.download", { jobId: "j" }), {
    downloaded: true,
  });
  assert.equal(seen[1].path, "/outputs/o/download");
  assert.equal(seen[1].options.binary, true);
  assert.equal(saved.data, blob);
});

test("a lost POST response retries the exact body and idempotency key", async () => {
  const { createGeminiApi } = await import("../src/services/gemini-api.js");
  let estimate = 0,
    posts = 0;
  const attempts = [];
  const call = createGeminiApi({
    fail: (code, message) => {
      throw Object.assign(new Error(message), { code });
    },
    saveDownload() {},
    request: async (url, options = {}) => {
      if (url === "/gemini/quota") return { remaining: 1000 };
      if (url.endsWith("/estimates")) return { id: `e${++estimate}` };
      if (url.endsWith("/messages") && options.method === "POST") {
        attempts.push(structuredClone(options));
        if (++posts === 1)
          throw Object.assign(new Error("Lost response"), {
            code: "NETWORK_ERROR",
          });
        return { id: "job", status: "succeeded" };
      }
      if (url.endsWith("/messages"))
        return [{ role: "assistant", content: "Done" }];
      return {
        id: "c",
        sources: [{ project_id: "p", release_id: "r" }],
        source_version: 1,
        plans: [],
        jobs: [],
      };
    },
  });
  const input = {
    chatId: "c",
    sources: [{ projectId: "p", releaseId: "r" }],
    stack: "Python",
    instruction: "Explain",
    text: "Hello",
  };
  await assert.rejects(call("gemini.message", input), {
    code: "NETWORK_ERROR",
  });
  await call("gemini.message", input);
  assert.deepEqual(attempts[1], attempts[0]);
  assert.equal(estimate, 1);
});
