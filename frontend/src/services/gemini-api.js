// Translate the existing conversation UI into the Python API contract.
// No model calls, credentials or entitlement decisions run in the browser.
export function createGeminiApi({ request, fail, saveDownload }) {
  const contexts = new Map();
  const pendingAttempts = new Map();
  let available = [];
  const path = (id) => `/gemini/conversations/${encodeURIComponent(id)}`;
  const refs = (sources = []) =>
    sources.map((s) => ({ project_id: s.projectId, release_id: s.releaseId }));
  const sourceKey = (sources) =>
    JSON.stringify(
      sources.map((s) => `${s.project_id}/${s.release_id}`).sort(),
    );
  const context = (p) => ({
    sources: p.sources || [],
    stack: p.stack?.trim() || "",
    instruction: p.instruction?.trim() || "",
  });
  const instructions = (p) => {
    const features = p.sources
      ?.filter((s) => s.features?.trim())
      .map((s) => `${s.projectId}/${s.releaseId}: ${s.features.trim()}`);
    return (
      p.instruction.trim() +
      (features?.length
        ? `\n\nSelected source features:\n${features.join("\n")}`
        : "")
    );
  };
  const validate = (p) => {
    if (!p.sources?.length || !p.stack?.trim() || !p.instruction?.trim())
      fail(
        "GEMINI_CONTEXT_REQUIRED",
        "Select source releases, a target stack and instructions.",
      );
  };
  const fingerprintFor = (url, body) =>
    JSON.stringify([url, { ...body, estimate_id: undefined }]);
  const uncertain = (code) =>
    [
      "NETWORK_ERROR",
      "JOB_PENDING",
      "PROVIDER_OUTCOME_UNKNOWN",
      "PROVIDER_UNAVAILABLE",
    ].includes(code) || /^HTTP_5/.test(code);
  async function operation(url, body, suppliedKey) {
    const fingerprint = fingerprintFor(url, body);
    const attempt = pendingAttempts.get(fingerprint) || {
      key: suppliedKey || crypto.randomUUID(),
      body: structuredClone(body),
    };
    pendingAttempts.set(fingerprint, attempt);
    try {
      attempt.result ||= await request(url, {
        method: "POST",
        body: attempt.body,
        key: attempt.key,
      });
      return { result: attempt.result, fingerprint };
    } catch (error) {
      if (!uncertain(error.code)) pendingAttempts.delete(fingerprint);
      throw error;
    }
  }
  async function waitFor(job) {
    const expires = Date.now() + 180000;
    while (["queued", "running", "pending"].includes(job.status)) {
      if (Date.now() >= expires)
        fail(
          "JOB_PENDING",
          "AI is still processing. Reopen this conversation to check its status; do not submit the operation again.",
        );
      await new Promise((resolve) => setTimeout(resolve, 750));
      job = await request(`/jobs/${encodeURIComponent(job.id)}`);
    }
    if (job.status !== "succeeded")
      fail(
        job.error || "GEMINI_JOB_FAILED",
        `AI job failed (${job.error || job.status}). Check the conversation before retrying.`,
      );
    return job;
  }
  async function prepare(p) {
    validate(p);
    const conversation = await request(path(p.chatId));
    if (
      conversation.jobs?.some((j) => ["queued", "running"].includes(j.status))
    )
      fail(
        "JOB_PENDING",
        "An AI job is already running. Reopen the conversation to check its status.",
      );
    if (sourceKey(conversation.sources || []) !== sourceKey(refs(p.sources)))
      await request(`${path(p.chatId)}/sources`, {
        method: "PUT",
        body: { sources: refs(p.sources) },
      });
    contexts.set(p.chatId, context(p));
    return request(`${path(p.chatId)}/estimates`, { method: "POST" });
  }
  function jobView(job) {
    const allowed =
      job.sources?.length &&
      job.sources.every((ref) =>
        available.some(
          (s) =>
            s.projectId === ref.project_id &&
            s.releaseId === ref.release_id &&
            s.derivativeAllowed,
        ),
      );
    return {
      ...job,
      planId: job.plan_id,
      output:
        job.status === "succeeded" && job.output_id
          ? { archiveId: job.output_id }
          : null,
      derivativeAllowed: Boolean(allowed),
      validation:
        Object.entries(job.validation || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(" · ") || "not-run",
      message: job.error
        ? `AI job failed (${job.error}).`
        : job.phase || job.status,
    };
  }
  async function get(chatId) {
    const [chat, messages, quota] = await Promise.all([
      request(path(chatId)),
      request(`${path(chatId)}/messages`),
      request("/gemini/quota"),
    ]);
    const latest = chat.plans.at(-1);
    const savedContext = contexts.get(chatId);
    const plans = chat.plans.map((p) => ({
      ...p,
      input:
        savedContext &&
        p === latest &&
        p.target_stack === savedContext.stack &&
        p.requirements === instructions(savedContext)
          ? savedContext
          : {
              sources: p.sources.map((s) => ({
                projectId: s.project_id,
                releaseId: s.release_id,
              })),
              stack: p.target_stack,
              instruction: p.requirements,
            },
      cost: p.generation_budget,
      balance: quota.remaining,
      messageRevision:
        p.source_version === chat.source_version &&
        ["awaiting_confirmation", "confirmed"].includes(p.state)
          ? messages.length
          : -1,
      steps: [p.content?.text, ...(p.content?.features || [])].filter(Boolean),
      limitations: p.content?.conflicts || [],
    }));
    return {
      ...chat,
      messages: messages.map((m) => ({ ...m, text: m.content })),
      plans,
      jobs: (chat.jobs || [])
        .filter((j) => j.operation === "generate")
        .map(jobView),
      pendingJobs: (chat.jobs || []).filter((j) =>
        ["queued", "running"].includes(j.status),
      ),
      context: plans.at(-1)?.input || savedContext,
      quota: quota.remaining,
    };
  }
  return async function call(operationName, p = {}) {
    switch (operationName) {
      case "gemini.sources": {
        const [catalog, quota] = await Promise.all([
          request("/gemini/sources"),
          request("/gemini/quota"),
        ]);
        available = catalog.sources.map((s) => ({
          ...s,
          projectId: s.project_id,
          releaseId: s.release_id,
          derivativeAllowed: s.derivative_allowed,
        }));
        return {
          sources: available,
          quota: quota.remaining,
          purchasedAvailable: catalog.purchased_available,
          quotaLabel: "Trial tokens",
        };
      }
      case "gemini.list": {
        const all = [];
        for (let page = 1; ; page++) {
          const rows = await request(
            `/gemini/conversations?page=${page}&page_size=100`,
          );
          all.push(
            ...rows.map((c) => ({
              ...c,
              messages: [],
              messageCount: c.message_count || 0,
            })),
          );
          if (rows.length < 100) return all;
        }
      }
      case "gemini.create": {
        const chat = await request("/gemini/conversations", {
          method: "POST",
          body: { title: p.title?.trim() || "New conversation" },
        });
        return { ...chat, messages: [], plans: [], jobs: [] };
      }
      case "gemini.get":
        return get(p.chatId);
      case "gemini.quote": {
        const estimate = await prepare(p);
        const quota = await request("/gemini/quota");
        return {
          ...estimate,
          cost: estimate.analysis_budget,
          balance: quota.remaining,
        };
      }
      case "gemini.message":
      case "gemini.plan": {
        if (operationName === "gemini.message" && !p.text?.trim())
          fail("INVALID_MESSAGE", "Write a message.");
        validate(p);
        const planning = operationName === "gemini.plan";
        const body = planning
          ? {
              requirements: instructions(p),
              target_stack: p.stack.trim(),
            }
          : { content: p.text.trim() };
        const url = `${path(p.chatId)}/${planning ? "plans" : "messages"}`;
        const previous = pendingAttempts.get(fingerprintFor(url, body));
        const requestBody = previous?.body || {
          ...body,
          estimate_id: (await prepare(p)).id,
        };
        const queued = await operation(url, requestBody, p.idempotencyKey);
        try {
          await waitFor(queued.result);
        } catch (error) {
          if (!uncertain(error.code))
            pendingAttempts.delete(queued.fingerprint);
          throw error;
        }
        pendingAttempts.delete(queued.fingerprint);
        const chat = await get(p.chatId);
        return planning ? chat.plans.at(-1) : chat;
      }
      case "gemini.confirm": {
        if (p.confirmed !== true)
          fail("CONFIRMATION_REQUIRED", "Explicit confirmation is required.");
        const chat = await get(p.chatId);
        const latest = chat.plans.at(-1);
        const desired = context(p);
        if (
          !latest ||
          latest.id !== p.planId ||
          latest.revision !== p.revision ||
          latest.messageRevision < 0 ||
          sourceKey(refs(latest.input.sources)) !==
            sourceKey(refs(desired.sources)) ||
          latest.input.stack !== desired.stack ||
          latest.input.instruction !== desired.instruction
        )
          fail(
            "PLAN_STALE",
            "Review the latest plan for your current sources and instructions.",
          );
        const queued = await operation(
          `/gemini/plans/${encodeURIComponent(p.planId)}/confirm`,
          { revision: p.revision },
          p.idempotencyKey,
        );
        return jobView(queued.result);
      }
      case "gemini.job":
        return jobView(await request(`/jobs/${encodeURIComponent(p.jobId)}`));
      case "gemini.download": {
        const job = await request(`/jobs/${encodeURIComponent(p.jobId)}`);
        if (job.status !== "succeeded" || !job.output_id)
          fail("OUTPUT_UNAVAILABLE", "The source ZIP is not ready.");
        const blob = await request(
          `/outputs/${encodeURIComponent(job.output_id)}/download`,
          { binary: true },
        );
        saveDownload(blob, `gemini-${job.id}.zip`);
        return { downloaded: true };
      }
      case "gemini.import":
        fail(
          "ARCHIVE_REQUIRED",
          "Source verification requires a ZIP archive and matching license evidence. Use an owned release or the source-import API; a URL alone cannot be verified.",
        );
        break;
      default:
        fail("UNKNOWN_OPERATION", "Unknown Gemini operation.");
    }
  };
}
