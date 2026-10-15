import test from "node:test";
import assert from "node:assert/strict";
import { createGeminiHandler } from "../src/services/gemini-demo.js";
import {
  currentPlanJob,
  transcriptMatchesPlan,
} from "../src/pages/gemini/model.js";

function setup() {
  let db = {
    projects: [
      {
        id: "one",
        creatorId: "buyer",
        title: "One",
        releases: [{ id: "r1" }],
        derivativeAllowed: true,
      },
    ],
    gemini: {},
  };
  let user = { id: "buyer" };
  const call = createGeminiHandler({
    read: () => structuredClone(db),
    write: (next) => {
      db = structuredClone(next);
    },
    requireUser: () => user,
  });
  return {
    call,
    db: () => db,
    update: (fn) => {
      fn(db);
    },
    user: (next) => {
      user = next;
    },
  };
}
test("generation requires current explicit plan confirmation and is idempotent", async () => {
  const { call } = setup();
  const chat = await call("create", { title: "Build" });
  const input = {
    chatId: chat.id,
    sources: [{ projectId: "one", releaseId: "r1" }],
    stack: "Vue",
    instruction: "Use search",
  };
  const plan = await call("plan", input);
  await assert.rejects(
    call("confirm", {
      ...input,
      planId: plan.id,
      revision: plan.revision,
      instruction: "Changed",
      confirmed: true,
    }),
    /changed|stale/i,
  );
  await assert.rejects(
    call("confirm", { ...input, planId: plan.id, revision: plan.revision }),
    /confirm/i,
  );
  await assert.rejects(
    call("confirm", {
      ...input,
      sources: [{ ...input.sources[0], features: "Changed features" }],
      planId: plan.id,
      revision: plan.revision,
      confirmed: true,
    }),
    /changed|stale/i,
  );
  const job = await call("confirm", {
    ...input,
    planId: plan.id,
    revision: plan.revision,
    confirmed: true,
  });
  assert.equal(
    (
      await call("confirm", {
        ...input,
        planId: plan.id,
        revision: plan.revision,
        confirmed: true,
      })
    ).id,
    job.id,
  );
  assert.equal(job.validation, "not-run");
  await assert.rejects(
    call("download", { jobId: job.id }),
    /demo|unavailable/i,
  );
});

test("trial quota is shared and confirmation rechecks access without double charging", async () => {
  const state = setup();
  const chat = await state.call("create", {});
  const input = {
    chatId: chat.id,
    sources: [{ projectId: "one", releaseId: "r1" }],
    stack: "Vue",
    instruction: "Build",
  };
  const old = await state.call("plan", input);
  const plan = await state.call("plan", {
    ...input,
    instruction: "Build search",
  });
  await assert.rejects(
    state.call("confirm", {
      ...input,
      planId: old.id,
      revision: old.revision,
      confirmed: true,
    }),
    /stale/i,
  );
  state.update((db) => {
    db.gemini.buyer.quota = 1;
  });
  await assert.rejects(
    state.call("confirm", {
      ...plan.input,
      chatId: chat.id,
      planId: plan.id,
      revision: plan.revision,
      confirmed: true,
    }),
    /insufficient/i,
  );
  assert.equal(state.db().gemini.buyer.quota, 1);
  state.update((db) => {
    db.gemini.buyer.quota = 30;
    db.projects[0].creatorId = "other";
  });
  await assert.rejects(
    state.call("confirm", {
      ...plan.input,
      chatId: chat.id,
      planId: plan.id,
      revision: plan.revision,
      confirmed: true,
    }),
    /access/i,
  );
  assert.equal(state.db().gemini.buyer.quota, 30);
});

test("purchased terms stay authoritative and more than two sources are supported", async () => {
  const state = setup();
  state.update((db) => {
    db.projects = ["a", "b", "c"].map((id) => ({
      id,
      title: id,
      creatorId: "other",
      derivativeAllowed: true,
      releases: [{ id: `${id}-r1` }],
    }));
    db.entitlements = db.projects.map((project) => ({
      projectId: project.id,
      holderId: "buyer",
      derivativeAllowed: false,
    }));
  });
  const sources = (await state.call("sources")).sources;
  assert.equal(sources.length, 3);
  assert.ok(sources.every((source) => source.derivativeAllowed === false));
  const chat = await state.call("create", {});
  const plan = await state.call("plan", {
    chatId: chat.id,
    sources,
    stack: "Django",
    instruction: "Combine selected features",
  });
  const job = await state.call("confirm", {
    chatId: chat.id,
    ...plan.input,
    planId: plan.id,
    revision: plan.revision,
    confirmed: true,
  });
  assert.equal(job.derivativeAllowed, false);
});
test("chat ownership, exact release rights and unverified imports are blocked", async () => {
  const state = setup();
  const chat = await state.call("create", {});
  await assert.rejects(
    state.call("plan", {
      chatId: chat.id,
      sources: [{ projectId: "one", releaseId: "missing" }],
      stack: "React",
      instruction: "Build",
    }),
    /release/i,
  );
  await assert.rejects(
    state.call("import", {
      url: "https://unknown.example/source.zip",
      license: "MIT",
      evidence: "I agree",
    }),
    /verify|verified|unavailable/i,
  );
  state.user({ id: "other" });
  await assert.rejects(state.call("get", { chatId: chat.id }), /found|access/i);
});

test("restoring a later plan does not attach an earlier generation job", async () => {
  const { call } = setup();
  const chat = await call("create", {});
  const input = {
    chatId: chat.id,
    sources: [{ projectId: "one", releaseId: "r1" }],
    stack: "Vue",
    instruction: "Build",
  };
  const first = await call("plan", input);
  await call("confirm", {
    ...input,
    planId: first.id,
    revision: first.revision,
    confirmed: true,
  });
  const latest = await call("plan", { ...input, instruction: "Build search" });
  assert.equal(currentPlanJob(await call("get", { chatId: chat.id })), null);
  const job = await call("confirm", {
    ...latest.input,
    chatId: chat.id,
    planId: latest.id,
    revision: latest.revision,
    confirmed: true,
  });
  assert.equal(
    currentPlanJob(await call("get", { chatId: chat.id })).id,
    job.id,
  );
});

test("sent and unsent instructions invalidate a plan until analysis includes the transcript", async () => {
  const { call } = setup();
  const chat = await call("create", {});
  const input = {
    chatId: chat.id,
    sources: [{ projectId: "one", releaseId: "r1" }],
    stack: "Vue",
    instruction: "Build",
  };
  const plan = await call("plan", input);
  assert.equal(plan.messageRevision, 0);
  assert.equal(transcriptMatchesPlan(plan, chat, ""), true);
  assert.equal(transcriptMatchesPlan(plan, chat, "Add checkout"), false);
  const updated = await call("message", { ...input, text: "Add checkout" });
  assert.equal(transcriptMatchesPlan(plan, updated, ""), false);
  await assert.rejects(
    call("confirm", {
      ...input,
      planId: plan.id,
      revision: plan.revision,
      confirmed: true,
    }),
    /stale|transcript/i,
  );
  const revised = await call("plan", input);
  assert.equal(revised.messageRevision, updated.messages.length);
  assert.equal(transcriptMatchesPlan(revised, updated, ""), true);
  const job = await call("confirm", {
    ...input,
    planId: revised.id,
    revision: revised.revision,
    confirmed: true,
  });
  assert.equal(job.planId, revised.id);
});
