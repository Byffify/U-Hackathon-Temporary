import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../app/AppContext.jsx";
import { externalUrl } from "../../app/navigation.js";
import {
  PageTitle,
  Notice,
  Empty,
  useResource,
  ErrorState,
  useTask,
  useDirtyGuard,
  useFormValidation,
  FormValidationError,
} from "../../app/ui.jsx";
import "./gemini.css";
import { currentPlanJob, transcriptMatchesPlan } from "./model.js";

export function GeminiHome() {
  const { service } = useApp();
  const navigate = useNavigate();
  const resource = useResource(() => service.call("gemini.list"), [service]);
  const task = useTask();
  const [title, setTitle] = useState("");
  async function create(event) {
    event.preventDefault();
    const chat = await task.run(() => service.call("gemini.create", { title }));
    if (chat) navigate(`/gemini/chats/${chat.id}`);
  }
  return (
    <div className="app-stack">
      <PageTitle title="Build with Gemini">
        Start with source you own. Ask questions, review a plan, then decide
        when to generate.
      </PageTitle>
      <form noValidate className="app-card app-form" onSubmit={create}>
        <h2>A new conversation</h2>
        <label className="app-field">
          Conversation name
          <input
            value={title}
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="My next project"
          />
        </label>
        <div className="app-actions">
          <button className="app-button" disabled={task.busy}>
            {task.busy ? "Creating…" : "Start conversation"}
          </button>
        </div>
        {task.error && <ErrorState error={task.error} />}
      </form>
      <section aria-labelledby="gemini-recent">
        <h2 id="gemini-recent">Your conversations</h2>
        {resource.loading ? (
          <p role="status">Loading conversations…</p>
        ) : resource.error ? (
          <ErrorState error={resource.error} retry={resource.reload} />
        ) : resource.data?.length ? (
          <ul className="gemini-history">
            {resource.data.map((chat) => (
              <li key={chat.id}>
                <Link to={`/gemini/chats/${chat.id}`}>{chat.title}</Link>
                <span className="app-muted">
                  {chat.messageCount ?? chat.messages.length} messages
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Your ideas start here">
            Create a conversation and choose one or more source projects.
          </Empty>
        )}
      </section>
    </div>
  );
}

export function GeminiChat() {
  const guidanceId = useId();
  const { chatId } = useParams();
  const { service, mode } = useApp();
  const resource = useResource(
    () =>
      Promise.all([
        service.call("gemini.get", { chatId }),
        service.call("gemini.sources"),
      ]),
    [service, chatId],
  );
  const task = useTask();
  const validation = useFormValidation();
  const [chat, setChat] = useState(null);
  const [selected, setSelected] = useState([]);
  const [stack, setStack] = useState("");
  const [instruction, setInstruction] = useState("");
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState(null);
  const [quote, setQuote] = useState(null);
  const [job, setJob] = useState(null);
  const [origin, setOrigin] = useState({
    url: "",
    snapshot: "",
    license: "",
    evidence: "",
  });
  const [balance, setBalance] = useState(null);
  const hydratedChat = useRef(null);
  useEffect(() => {
    if (!resource.data) return;
    const [loaded, sourceData] = resource.data;
    const latest = loaded.plans.at(-1);
    const context = loaded.context || latest?.input;
    setChat(loaded);
    setPlan(latest || null);
    setJob(currentPlanJob(loaded));
    setBalance(sourceData.quota);
    if (hydratedChat.current !== chatId) {
      setSelected(context?.sources || []);
      setStack(context?.stack || "");
      setInstruction(context?.instruction || "");
      hydratedChat.current = chatId;
    }
    setQuote(null);
  }, [resource.data]);
  useEffect(() => {
    if (!job || !["queued", "pending", "running"].includes(job.status)) return;
    const timer = setInterval(() => {
      task
        .run(() => service.call("gemini.job", { jobId: job.id }))
        .then((next) => {
          if (next) setJob(next);
        });
    }, 3000);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, service]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!chat?.pendingJobs?.some((item) => item.operation !== "generate"))
      return;
    const timer = setInterval(() => resource.reload(), 3000);
    return () => clearInterval(timer);
  }, [chat?.pendingJobs?.map((item) => item.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const sources = resource.data?.[1]?.sources || [];
  const input = { chatId, sources: selected, stack, instruction };
  const signature = (value) =>
    JSON.stringify({
      sources: value.sources
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
      stack: value.stack.trim(),
      instruction: value.instruction.trim(),
    });
  const planCurrent =
    plan &&
    signature(input) === signature(plan.input) &&
    transcriptMatchesPlan(plan, chat, message);
  useDirtyGuard(
    Boolean(
      chat &&
      (Object.values(origin).some((value) => value.trim()) ||
        message.trim() ||
        (plan || chat.context
          ? signature(input) !== signature(plan?.input || chat.context)
          : selected.length || stack.trim() || instruction.trim())),
    ),
  );
  const quoteCurrent =
    quote?.signature === signature(input) &&
    quote?.messageRevision === chat?.messages.length &&
    !message.trim();
  const missingContext = [
    !selected.length && "select a source release",
    !stack.trim() && "enter a target stack",
    !instruction.trim() && "describe what this project should do",
  ].filter(Boolean);
  function prerequisiteGuidance(action, missing, ready) {
    if (task.busy)
      return `An operation is in progress. Wait for it to finish before ${action}.`;
    return missing.length ? `Before ${action}: ${missing.join("; ")}.` : ready;
  }
  const confirmGuidance = [
    task.busy && "An operation is in progress. Wait for it to finish.",
    message.trim() &&
      "Send or clear your unsent message, then check quota and review a new plan.",
    !planCurrent &&
      !message.trim() &&
      "Check quota and review a new plan for your current context and conversation.",
    job && "Generation already exists for this plan. Review its status below.",
    plan &&
      balance < plan.cost &&
      "Insufficient trial quota. Reduce the request, then check quota and review a new plan.",
  ]
    .filter(Boolean)
    .join(" ");
  function change(setter, value) {
    setter(value);
    setQuote(null);
  }
  async function getQuote() {
    const result = await task.run(() => service.call("gemini.quote", input));
    if (result) {
      setQuote({
        ...result,
        signature: signature(input),
        messageRevision: chat.messages.length,
      });
      setBalance(result.balance);
    }
  }
  async function analyze() {
    const result = await task.run(() => service.call("gemini.plan", input));
    if (result) {
      setPlan(result);
      setBalance(result.balance);
      setQuote(null);
      setJob(null);
    }
  }
  async function send(event) {
    event.preventDefault();
    const result = await task.run(() =>
      service.call("gemini.message", { ...input, text: message }),
    );
    if (result) {
      setChat(result);
      if (result.quota != null) setBalance(result.quota);
      setMessage("");
      setQuote(null);
    }
  }
  async function confirm() {
    const result = await task.run(() =>
      service.call("gemini.confirm", {
        ...input,
        planId: plan.id,
        revision: plan.revision,
        messageRevision: plan.messageRevision,
        idempotencyKey: `${chatId}:${plan.id}:${plan.revision}`,
        confirmed: true,
      }),
    );
    if (result) {
      setJob(result);
      setBalance((value) => (value == null ? value : value - plan.cost));
    }
  }
  if (resource.loading) return <p role="status">Opening conversation…</p>;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  if (!chat) return null;
  return (
    <div className="app-stack">
      <PageTitle
        title={chat.title}
        actions={
          <Link className="app-button secondary" to="/gemini">
            All conversations
          </Link>
        }
      >
        Gemini · source-aware planning and code conversations
      </PageTitle>
      {mode === "demo" && (
        <Notice>
          Demo mode. Conversations and quota use local sample data. Gemini,
          source inspection, ZIP creation, and validation do not run.
        </Notice>
      )}
      {chat.pendingJobs?.some((item) => item.operation !== "generate") && (
        <Notice>
          An AI task is still processing. Its status refreshes automatically;
          avoid submitting it again.
        </Notice>
      )}
      {resource.data?.[1]?.purchasedAvailable === false && mode !== "demo" && (
        <Notice>
          Owned source releases are available. Purchased sources cannot be
          checked while the chain connection is unavailable.
        </Notice>
      )}
      <div className="gemini-workspace">
        <aside className="app-card app-stack" aria-label="Conversation context">
          <div>
            <h2>Source context</h2>
            <p className="app-muted">
              Choose one or more owned or purchased releases. There is no fixed
              source limit.
            </p>
          </div>
          <fieldset className="gemini-sources">
            <legend>Available source releases</legend>
            {sources.length ? (
              sources.map((source) => {
                const checked = selected.some(
                  (item) =>
                    item.projectId === source.projectId &&
                    item.releaseId === source.releaseId,
                );
                return (
                  <label key={`${source.projectId}/${source.releaseId}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={task.busy}
                      onChange={() =>
                        change(
                          setSelected,
                          checked
                            ? selected.filter(
                                (item) =>
                                  item.projectId !== source.projectId ||
                                  item.releaseId !== source.releaseId,
                              )
                            : [
                                ...selected,
                                {
                                  projectId: source.projectId,
                                  releaseId: source.releaseId,
                                },
                              ],
                        )
                      }
                    />
                    <span>
                      <strong>{source.title}</strong>
                      <small>
                        {source.version} · {source.stack || "Original stack"}
                      </small>
                    </span>
                  </label>
                );
              })
            ) : (
              <p>
                No accessible releases.{" "}
                <Link to="/explore">Explore projects</Link> or upload your own
                source.
              </p>
            )}
          </fieldset>
          {selected.map((source) => (
            <label
              className="app-field"
              key={`${source.projectId}/${source.releaseId}/features`}
            >
              Features from{" "}
              {sources.find(
                (item) =>
                  item.projectId === source.projectId &&
                  item.releaseId === source.releaseId,
              )?.title || source.projectId}
              <input
                value={source.features || ""}
                disabled={task.busy}
                placeholder="All features, or name only the parts you need"
                onChange={(event) =>
                  change(
                    setSelected,
                    selected.map((item) =>
                      item === source
                        ? { ...item, features: event.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
          ))}
          <label className="app-field">
            Target stack
            <input
              value={stack}
              onChange={(event) => change(setStack, event.target.value)}
              placeholder="Keep original, Vue, Laravel…"
              disabled={task.busy}
            />
          </label>
          <label className="app-field">
            What should this project do?
            <textarea
              className="resize-none"
              rows={5}
              value={instruction}
              onChange={(event) => change(setInstruction, event.target.value)}
              placeholder="Describe the features to keep, adapt, or combine."
              disabled={task.busy}
            />
          </label>
          <p className="app-muted">
            Trial quota: {balance ?? "—"}. Shared across your conversations. No
            daily reset or top-up; purchases do not award quota.
          </p>
          <button
            className="app-button secondary"
            type="button"
            aria-describedby={`${guidanceId}-quote`}
            disabled={
              task.busy ||
              !selected.length ||
              !stack.trim() ||
              !instruction.trim()
            }
            onClick={getQuote}
          >
            Check analysis quota
          </button>
          <p className="app-muted" id={`${guidanceId}-quote`}>
            {prerequisiteGuidance(
              "checking quota",
              missingContext,
              "Ready to check analysis quota.",
            )}
          </p>
          {quoteCurrent && (
            <div className="app-stack">
              <p>
                {quote.demo ? "Demo estimate" : "Estimated usage"}: {quote.cost}{" "}
                quota · {quote.balance} available.
              </p>
              <button
                className="app-button"
                disabled={task.busy || quote.balance < quote.cost}
                aria-describedby={`${guidanceId}-analyze`}
                onClick={analyze}
              >
                Use {quote.cost} quota to review a plan
              </button>
              <p className="app-muted" id={`${guidanceId}-analyze`}>
                {task.busy
                  ? "An operation is in progress. Wait for it to finish before reviewing a plan."
                  : quote.balance < quote.cost
                    ? "Insufficient trial quota. Reduce the request, then check analysis quota again."
                    : "Review the estimate before using quota to review a plan."}
              </p>
            </div>
          )}
          <details>
            <summary>Import open-source context</summary>
            <form
              noValidate
              className="app-form"
              onInput={validation.onInput}
              onSubmit={async (event) => {
                event.preventDefault();
                if (!validation.validate(event.currentTarget)) return;
                const result = await task.run(() =>
                  service.call("gemini.import", origin),
                );
                if (result) resource.reload();
              }}
            >
              <FormValidationError validation={validation} />
              <p className="app-muted">
                The backend must verify the origin, immutable snapshot, license,
                and evidence before source can be used. A declaration alone does
                not grant permission.
              </p>
              {[
                ["url", "Origin URL"],
                ["snapshot", "Snapshot or commit"],
                ["license", "License identifier"],
                ["evidence", "License evidence URL"],
              ].map(([key, label]) => (
                <label className="app-field" key={key}>
                  {label}
                  <input
                    required
                    type={key === "url" || key === "evidence" ? "url" : "text"}
                    value={origin[key]}
                    onChange={(event) =>
                      setOrigin({ ...origin, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
              <button className="app-button secondary" disabled={task.busy}>
                Verify source rights
              </button>
            </form>
          </details>
        </aside>
        <div className="app-stack gemini-thread" aria-label="Conversation">
          <section
            className="app-card app-stack"
            aria-labelledby="gemini-messages"
          >
            <h2 id="gemini-messages">Conversation</h2>
            <div
              className="gemini-messages"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {chat.messages.length ? (
                chat.messages.map((item) => (
                  <article
                    key={item.id}
                    className={`gemini-message ${item.role === "user" ? "from-user" : ""}`}
                  >
                    <strong>{item.role === "user" ? "You" : "Gemini"}</strong>
                    <p>{item.text}</p>
                  </article>
                ))
              ) : (
                <p className="app-muted">
                  Ask how a selected project works, explain a feature, or
                  describe what you want to change.
                </p>
              )}
            </div>
            <form noValidate className="app-form" onSubmit={send}>
              <label className="app-field">
                Ask or explain
                <textarea
                  className="resize-none"
                  rows={3}
                  disabled={task.busy}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="How should these features fit together?"
                />
              </label>
              <div className="app-actions">
                <button
                  className="app-button"
                  aria-describedby={`${guidanceId}-send`}
                  disabled={
                    task.busy ||
                    !message.trim() ||
                    !selected.length ||
                    !stack.trim() ||
                    !instruction.trim()
                  }
                >
                  Send message
                </button>
              </div>
              <p className="app-muted" id={`${guidanceId}-send`}>
                {prerequisiteGuidance(
                  "sending",
                  [
                    ...missingContext,
                    ...(!message.trim() ? ["write a message"] : []),
                  ],
                  "Ready to send your message.",
                )}
              </p>
            </form>
          </section>
          {plan && (
            <section
              className="app-card app-stack"
              aria-labelledby="gemini-plan"
            >
              <h2 id="gemini-plan">Review plan · revision {plan.revision}</h2>
              <ol>
                {plan.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
              <ul className="app-muted">
                {plan.limitations?.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {!planCurrent && (
                <Notice tone="warning">
                  Your sources, target stack, or instructions changed. Check
                  quota and review a new plan before generating.
                </Notice>
              )}
              <p>
                {plan.demo ? "Demo generation estimate" : "Generation estimate"}
                : {plan.cost} quota. Starting requires your confirmation.
              </p>
              <button
                className="app-button"
                aria-describedby={`${guidanceId}-confirm`}
                disabled={
                  task.busy ||
                  !planCurrent ||
                  Boolean(job) ||
                  balance < plan.cost
                }
                onClick={confirm}
              >
                {task.busy
                  ? "Working…"
                  : plan.demo
                    ? "Confirm plan and simulate generation"
                    : "Confirm plan and generate ZIP"}
              </button>
              <p className="app-muted" id={`${guidanceId}-confirm`}>
                {confirmGuidance ||
                  "Confirm only when this plan matches what you want to generate."}
              </p>
            </section>
          )}
          {job && (
            <section className="app-card app-stack" aria-live="polite">
              <h2>Generation · {job.status}</h2>
              <p>{job.message}</p>
              <p className="app-muted">
                Validation: {job.validation || "not-run"}
              </p>
              {job.output && (
                <button
                  className="app-button secondary"
                  disabled={task.busy}
                  aria-describedby={`${guidanceId}-download`}
                  onClick={async () => {
                    const result = await task.run(() =>
                      service.call("gemini.download", { jobId: job.id }),
                    );
                    if (result?.url) {
                      const url = externalUrl(result.url);
                      if (url) window.location.assign(url);
                      else
                        await task.run(() => {
                          throw new Error(
                            "The source download URL is invalid. Request the download again.",
                          );
                        });
                    }
                  }}
                >
                  Download source ZIP
                </button>
              )}
              {job.output && (
                <p className="app-muted" id={`${guidanceId}-download`}>
                  {task.busy
                    ? "An operation is in progress. Wait for it to finish before downloading the ZIP."
                    : "Your generated source ZIP is available to download."}
                </p>
              )}
              {!job.output && job.status === "simulated" && (
                <p>No downloadable ZIP exists in demo mode.</p>
              )}
              {job.output?.archiveId && job.derivativeAllowed && (
                <Link
                  className="app-button secondary"
                  to={`/workspace/projects/new?job=${encodeURIComponent(job.id)}`}
                >
                  Prepare derivative listing
                </Link>
              )}
            </section>
          )}
          {task.error && <ErrorState error={task.error} />}
        </div>
      </div>
    </div>
  );
}
