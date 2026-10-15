const id = (prefix) => `${prefix}-${globalThis.crypto.randomUUID()}`;
const fail = (message, code = "GEMINI_INVALID") => {
  const error = new Error(message);
  error.code = code;
  throw error;
};
const contextKey = ({ sources = [], stack = "", instruction = "" }) =>
  JSON.stringify({
    sources: sources
      .map(({ projectId, releaseId, features = "" }) => ({
        projectId,
        releaseId,
        features: features.trim(),
      }))
      .sort((a, b) =>
        `${a.projectId}/${a.releaseId}`.localeCompare(
          `${b.projectId}/${b.releaseId}`,
        ),
      ),
    stack: stack.trim(),
    instruction: instruction.trim(),
  });

export function createGeminiHandler({ read, write, requireUser }) {
  return async function handle(operation, payload = {}) {
    operation = operation.replace(/^gemini\./, "");
    const user = requireUser();
    const db = read();
    db.gemini ||= {};
    const state = (db.gemini[user.id] ||= { chats: [], quota: 100 });
    const save = (value) => {
      write(db);
      return structuredClone(value);
    };
    const available = () =>
      (db.projects || []).flatMap((project) => {
        const entitlement = (db.entitlements || []).find(
          (item) => item.projectId === project.id && item.holderId === user.id,
        );
        if (project.creatorId !== user.id && !entitlement) return [];
        return (project.releases || []).map((release) => ({
          projectId: project.id,
          releaseId: release.id,
          title: project.title,
          version: release.version || release.id,
          stack: project.stack,
          derivativeAllowed:
            project.creatorId === user.id ||
            entitlement.derivativeAllowed === true,
        }));
      });
    const validate = (input) => {
      if (!input.sources?.length) fail("Select at least one source.");
      const permitted = available();
      for (const source of input.sources)
        if (
          !permitted.some(
            (item) =>
              item.projectId === source.projectId &&
              item.releaseId === source.releaseId,
          )
        )
          fail(
            "Source release access changed. Select an available release.",
            "SOURCE_ACCESS",
          );
      if (!input.stack?.trim()) fail("Enter a target stack.");
      if (!input.instruction?.trim()) fail("Describe what you want to build.");
    };
    if (operation === "sources")
      return {
        sources: available(),
        quota: state.quota,
        quotaLabel: "Demo trial quota",
        analysisCost: 2,
        generationCost: 10,
      };
    if (operation === "list") return structuredClone(state.chats);
    if (operation === "create") {
      const chat = {
        id: id("chat"),
        title: payload.title?.trim().slice(0, 100) || "Untitled conversation",
        messages: [],
        plans: [],
        jobs: [],
        updatedAt: new Date().toISOString(),
      };
      state.chats.unshift(chat);
      return save(chat);
    }
    if (operation === "import")
      fail(
        "External license evidence cannot be verified in demo mode. Use an owned or purchased source; connected mode requires backend verification.",
        "IMPORT_UNAVAILABLE",
      );
    const chat = state.chats.find((item) => item.id === payload.chatId);
    if (["job", "download"].includes(operation)) {
      const jobChat = state.chats.find((item) =>
        item.jobs.some((job) => job.id === payload.jobId),
      );
      const job = jobChat?.jobs.find((item) => item.id === payload.jobId);
      if (!job) fail("Job not found.", "NOT_FOUND");
      validate(job.input);
      if (operation === "download")
        fail(
          "ZIP download is unavailable in demo mode. No code was generated.",
          "DEMO_UNAVAILABLE",
        );
      return structuredClone(job);
    }
    if (!chat) fail("Conversation not found or access denied.", "NOT_FOUND");
    if (operation === "get") return structuredClone(chat);
    if (operation === "quote") {
      validate(payload);
      return {
        cost: payload.kind === "generation" ? 10 : 2,
        balance: state.quota,
        demo: true,
        contextKey: contextKey(payload),
      };
    }
    if (operation === "message") {
      if (!payload.text?.trim()) fail("Write a message.");
      validate(payload);
      chat.context = {
        sources: payload.sources,
        stack: payload.stack,
        instruction: payload.instruction,
      };
      chat.updatedAt = new Date().toISOString();
      chat.messages.push(
        { id: id("message"), role: "user", text: payload.text.trim() },
        {
          id: id("message"),
          role: "assistant",
          text: "Demo response: I can explain the selected source context and propose a plan. Source files have not been read and Gemini has not been called. Connect the backend for source-specific analysis.",
        },
      );
      return save(chat);
    }
    if (operation === "plan") {
      validate(payload);
      if (state.quota < 2)
        fail(
          "Trial quota is insufficient. Reduce the request or return to an existing conversation.",
          "QUOTA_INSUFFICIENT",
        );
      state.quota -= 2;
      const plan = {
        id: id("plan"),
        revision: chat.plans.length + 1,
        messageRevision: chat.messages.length,
        contextKey: contextKey(payload),
        input: {
          sources: payload.sources,
          stack: payload.stack.trim(),
          instruction: payload.instruction.trim(),
        },
        cost: 10,
        balance: state.quota,
        demo: true,
        steps: [
          "Review selected source interfaces and license constraints.",
          `Adapt selected features to ${payload.stack.trim()}.`,
          "Resolve dependencies and produce a source ZIP after confirmation.",
        ],
        limitations: [
          "Illustrative plan only; source inspection and model analysis have not run.",
          "Build, tests, security review, and license validation have not run.",
        ],
      };
      chat.plans.push(plan);
      chat.context = plan.input;
      chat.updatedAt = new Date().toISOString();
      return save(plan);
    }
    if (operation === "confirm") {
      if (payload.confirmed !== true)
        fail("Explicit confirmation is required.");
      validate(payload);
      const plan = chat.plans.at(-1);
      if (
        !plan ||
        plan.id !== payload.planId ||
        plan.revision !== payload.revision ||
        plan.messageRevision !== chat.messages.length ||
        plan.contextKey !== contextKey(payload)
      )
        fail(
          "The plan changed or is stale. Review a new plan before confirming.",
          "PLAN_STALE",
        );
      const previous = chat.jobs.find((job) => job.planId === plan.id);
      if (previous) return structuredClone(previous);
      if (state.quota < plan.cost)
        fail(
          "Trial quota is insufficient for this plan.",
          "QUOTA_INSUFFICIENT",
        );
      state.quota -= plan.cost;
      const job = {
        id: id("job"),
        planId: plan.id,
        status: "simulated",
        validation: "not-run",
        input: plan.input,
        output: null,
        derivativeAllowed: plan.input.sources.every(
          (source) =>
            available().find(
              (item) =>
                item.projectId === source.projectId &&
                item.releaseId === source.releaseId,
            )?.derivativeAllowed,
        ),
        message:
          "Demo job recorded. Gemini generation, ZIP creation, and validation have not run.",
      };
      chat.jobs.push(job);
      return save(job);
    }
    fail("Unknown Gemini operation.", "NOT_FOUND");
  };
}
