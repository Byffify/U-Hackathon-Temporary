import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useApp } from "../../app/AppContext.jsx";
import {
  PageTitle,
  Notice,
  Empty,
  ProjectCard,
  useResource,
  ErrorState,
  useTask,
  useDirtyGuard,
  useFormValidation,
  FormValidationError,
} from "../../app/ui.jsx";
import { splitSale, formatAvax } from "../../utils/pricing.js";
import { NETWORK_NAME, NATIVE_TOKEN_SYMBOL } from "../../lib/network.js";
import {
  publishProjectWithWallet,
  signInWithWallet,
} from "../../lib/wallet.js";
import {
  archiveError,
  priceText,
  priceUnits,
  safeReturn,
  walletError,
  safeDownloadUrl,
  imageError,
  paymentReceipt,
  finishWalletPurchase,
  assertPurchaseBinding,
} from "./helpers.js";

function Loading({ children = "Loading…" }) {
  return (
    <p role="status" className="app-muted">
      {children}
    </p>
  );
}
function TaskError({ error }) {
  return error ? (
    <Notice tone="error">
      {error.message || "The request failed. Try again."}
    </Notice>
  ) : null;
}
function Field({ label, children, hint }) {
  return (
    <label className="app-field">
      <span>{label}</span>
      {children}
      {hint && <small className="app-muted">{hint}</small>}
    </label>
  );
}
function Rights({ project }) {
  return (
    <dl className="app-list">
      <div>
        <dt>License resale</dt>
        <dd>{project.resaleAllowed ? "Allowed" : "Not allowed"}</dd>
      </div>
      <div>
        <dt>Sell derivative work</dt>
        <dd>{project.derivativeAllowed ? "Allowed" : "Not allowed"}</dd>
      </div>
      <div className="app-list-prose">
        <dt>License terms</dt>
        <dd>{project.license || "No additional terms provided."}</dd>
      </div>
    </dl>
  );
}
function isOwner(user, project) {
  return (
    user &&
    project &&
    (project.creatorId === user.id || project.creator?.id === user.id)
  );
}

export function ConnectPage() {
  const {
    service,
    user: sessionUser,
    refreshSession,
    mode,
    sessionExpired,
  } = useApp();
  const user = sessionExpired ? null : sessionUser;
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const task = useTask();
  const target = safeReturn(search.get("returnTo") || search.get("next"));
  async function login(account) {
    const result = await task.run(async () => {
      if (mode === "demo") await service.call("auth.demoLogin", { account });
      else {
        try {
          await signInWithWallet(service, window.ethereum);
        } catch (error) {
          throw walletError(error);
        }
      }
      const session = await refreshSession();
      if (!session)
        throw new Error(
          "Sign-in could not be verified. Connect again to retry.",
        );
      return true;
    });
    if (result) navigate(target, { replace: true });
  }
  return (
    <>
      <PageTitle title="Your next project starts here">
        Connect to manage your projects, purchases, and source access.
      </PageTitle>
      <section className="app-card app-stack">
        <TaskError error={task.error} />
        {user ? (
          <>
            <h2>You’re connected</h2>
            <p>{user.name || user.address || "Your account"} is ready.</p>
            <Link className="app-button" to={target}>
              Continue
            </Link>
          </>
        ) : (
          <>
            <h2>
              {mode === "demo"
                ? "Explore with a demo account"
                : "Connect your wallet"}
            </h2>
            <p>
              {mode === "demo"
                ? "Demo activity is saved in this browser. Purchases use simulated balances; source downloads are not included."
                : "Sign a one-time message to prove ownership. Connecting alone does not create a verified session."}
            </p>
            <div className="app-actions">
              {mode === "demo" ? (
                <>
                  <button
                    className="app-button"
                    disabled={task.busy}
                    onClick={() => login("buyer")}
                  >
                    {task.busy ? "Connecting…" : "Continue as buyer"}
                  </button>
                  <button
                    className="app-button secondary"
                    disabled={task.busy}
                    onClick={() => login("creator")}
                  >
                    Continue as creator
                  </button>
                </>
              ) : (
                <button
                  className="app-button"
                  disabled={task.busy}
                  onClick={() => login()}
                >
                  {task.busy ? "Waiting for wallet…" : "Connect and sign in"}
                </button>
              )}
            </div>
            {mode !== "demo" && (
              <p className="app-muted">
                {NETWORK_NAME} · {NATIVE_TOKEN_SYMBOL}
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}

export function ProfileSettingsPage() {
  const { service, user, refreshSession } = useApp();
  const profile = useResource(
    () => service.call("profiles.get"),
    [service, user?.id],
  );
  const [values, setValues] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    avatarUrl: user?.avatarUrl || "",
  });
  const [baseline, setBaseline] = useState(JSON.stringify(values));
  const [saved, setSaved] = useState(false);
  const task = useTask();
  const validation = useFormValidation();
  useDirtyGuard(JSON.stringify(values) !== baseline);
  useEffect(() => {
    if (!profile.data) return;
    const next = {
      name: profile.data.name || "",
      bio: profile.data.bio || "",
      avatarUrl: profile.data.avatarUrl || "",
    };
    setValues(next);
    setBaseline(JSON.stringify(next));
  }, [profile.data]);
  function change(key, value) {
    setValues((old) => ({ ...old, [key]: value }));
    setSaved(false);
  }
  async function save(event) {
    event.preventDefault();
    if (!validation.validate(event.currentTarget)) return;
    const result = await task.run(async () => {
      await service.call("profiles.update", values);
      await refreshSession();
      return true;
    });
    if (result) {
      setBaseline(JSON.stringify(values));
      setSaved(true);
    }
  }
  if (profile.loading) return <Loading>Loading profile…</Loading>;
  if (profile.error)
    return <ErrorState error={profile.error} retry={profile.reload} />;
  return (
    <>
      <PageTitle title="Make yourself recognizable">
        Your profile appears alongside the projects you create.
      </PageTitle>
      <form
        noValidate
        className="app-card app-form"
        onSubmit={save}
        onInput={validation.onInput}
      >
        <FormValidationError validation={validation} />
        <TaskError error={task.error} />
        {saved && <Notice tone="success">Profile saved.</Notice>}
        <Field label="Display name">
          <input
            disabled={task.busy}
            required
            maxLength={80}
            autoComplete="nickname"
            value={values.name}
            onChange={(e) => change("name", e.target.value)}
          />
        </Field>
        <Field label="Bio">
          <textarea
            className="resize-none"
            disabled={task.busy}
            rows={4}
            maxLength={1000}
            value={values.bio}
            onChange={(e) => change("bio", e.target.value)}
          />
        </Field>
        <Field label="Avatar URL" hint="Use a public HTTPS image URL.">
          <input
            disabled={task.busy}
            type="url"
            pattern="https://.*"
            value={values.avatarUrl}
            onChange={(e) => change("avatarUrl", e.target.value)}
          />
        </Field>
        <div className="app-actions">
          <button className="app-button" disabled={task.busy}>
            {task.busy ? "Saving…" : "Save profile"}
          </button>
          <Link className="app-button secondary" to="/workspace/projects">
            Back to workspace
          </Link>
        </div>
      </form>
    </>
  );
}

export function WorkspacePage() {
  const { service } = useApp();
  const [page, setPage] = useState(1);
  const resource = useResource(
    () => service.call("projects.list", { mine: true, page }),
    [service, page],
  );
  const projects = resource.data?.items || [];
  const sections = [
    {
      title: "Drafts",
      items: projects.filter((project) => project.status === "draft"),
    },
    {
      title: "Published",
      items: projects.filter((project) => project.status === "published"),
    },
  ];
  return (
    <>
      <PageTitle
        title="Your creator workspace"
        actions={
          <Link className="app-button" to="/workspace/projects/new">
            Create project
          </Link>
        }
      >
        Turn your source into something others can build on.
      </PageTitle>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : projects.length ? (
        <>
          {sections
            .filter((section) => section.items.length)
            .map((section) => (
              <section className="app-stack" key={section.title}>
                <h2>{section.title}</h2>
                <div className="app-grid">
                  {section.items.map((project) => (
                    <article className="app-card app-stack" key={project.id}>
                      <ProjectCard project={project} />
                      <div className="app-actions">
                        <Link
                          className="app-button secondary"
                          to={`/workspace/projects/${project.id}/edit`}
                        >
                          Edit project
                        </Link>
                        {project.status === "published" && (
                          <Link
                            className="app-button secondary"
                            to={`/workspace/projects/${project.id}/releases/new`}
                          >
                            Add release
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          {resource.data.total > resource.data.pageSize && (
            <nav className="app-actions" aria-label="Your projects pages">
              <button
                className="app-button secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of{" "}
                {Math.ceil(resource.data.total / resource.data.pageSize)}
              </span>
              <button
                className="app-button secondary"
                disabled={page * resource.data.pageSize >= resource.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <Empty title="A home for your first project">
          <p>
            Add the details, license terms, and source ZIP to prepare your
            listing.
          </p>
          <Link className="app-button" to="/workspace/projects/new">
            Create project
          </Link>
        </Empty>
      )}
    </>
  );
}

const initialProject = {
  title: "",
  description: "",
  stack: "",
  demoUrl: "",
  price: "",
  resaleAllowed: false,
  derivativeAllowed: false,
  license: "",
  screenshots: [],
};
function projectValues(project) {
  return {
    ...initialProject,
    ...project,
    demoUrl: project.demoUrl || "",
    stack: Array.isArray(project.stack)
      ? project.stack.join(", ")
      : project.stack || "",
    price: priceText(project.priceUnits),
  };
}

export function ProjectEditorPage() {
  const { projectId, id } = useParams();
  const key = projectId || id;
  const { service, user } = useApp();
  const resource = useResource(async () => {
    if (!key) return null;
    const project = await service.call("projects.get", { id: key });
    if (service.mode !== "api" || project.status === "published")
      return project;
    const releases = await service.call("projects.releases", { id: key });
    return { ...project, uploadId: releases.at(-1)?.id || null };
  }, [service, key]);
  if (resource.loading) return <Loading>Loading project…</Loading>;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  if (resource.data && !isOwner(user, resource.data))
    return (
      <Empty title="This workspace belongs to another creator">
        <Link to="/workspace/projects">Return to your workspace</Link>
      </Empty>
    );
  return <ProjectForm key={key || "new"} project={resource.data} />;
}

function ProjectForm({ project }) {
  const { service, user } = useApp();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [values, setValues] = useState(
    project ? projectValues(project) : initialProject,
  );
  const [baseline, setBaseline] = useState(JSON.stringify(values));
  const [draftId, setDraftId] = useState(project?.id);
  const [file, setFile] = useState(null);
  const sourceUploadKey = useRef(null);
  const [upload, setUpload] = useState(
    project?.uploadId ? { id: project.uploadId } : null,
  );
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageUpload, setImageUpload] = useState(null);
  const [imageProgress, setImageProgress] = useState(0);
  const task = useTask();
  const validation = useFormValidation();
  const formRef = useRef(null);
  const dirty =
    JSON.stringify(values) !== baseline ||
    Boolean(file && !upload) ||
    Boolean(imageFile && !imageUpload);
  useDirtyGuard(dirty && !publishing);
  function change(key, value) {
    setValues((old) => ({ ...old, [key]: value }));
    setSaved(false);
  }
  async function saveDraft() {
    const payload = {
      id: draftId,
      title: values.title.trim(),
      description: values.description.trim(),
      stack: values.stack
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      demoUrl: values.demoUrl,
      priceUnits: priceUnits(values.price),
      resaleAllowed: values.resaleAllowed,
      derivativeAllowed: values.derivativeAllowed,
      license: values.license.trim(),
      screenshots: values.screenshots || [],
      ...(search.get("job") ? { outputRef: search.get("job") } : {}),
    };
    const draft = await service.call("projects.save", payload);
    setDraftId(draft.id);
    setBaseline(JSON.stringify(values));
    setSaved(true);
    return draft;
  }
  async function submit(event) {
    event.preventDefault();
    if (!validation.validate(event.currentTarget)) return;
    await task.run(saveDraft);
  }
  async function uploadFile() {
    if (!validation.validate(formRef.current)) return;
    await task.run(async () => {
      const error = archiveError(file);
      if (error) throw new Error(error);
      const draft = await saveDraft();
      const result = await service.call("projects.upload", {
        projectId: draft.id,
        file,
        version: "1.0.0",
        idempotencyKey: (sourceUploadKey.current ??= crypto.randomUUID()),
        onProgress: setProgress,
      });
      setUpload(result);
      return result;
    });
  }
  async function publish() {
    if (!validation.validate(formRef.current)) return;
    const result = await task.run(async () => {
      if (!upload) throw new Error("Upload the source ZIP before publishing.");
      const draft = await saveDraft();
      return service.mode === "demo"
        ? service.call("projects.publish", {
            id: draft.id,
            uploadId: upload.id || upload.uploadId,
          })
        : publishProjectWithWallet({
            service,
            provider: window.ethereum,
            storage: window.sessionStorage,
            project: draft,
            address: user?.address,
          });
    });
    if (result) setPublishing(true);
  }
  async function uploadImage() {
    if (!validation.validate(formRef.current)) return;
    await task.run(async () => {
      const error = imageError(imageFile);
      if (error) throw new Error(error);
      const draft = await saveDraft();
      const result = await service.call("images.upload", {
        projectId: draft.id,
        file: imageFile,
        onProgress: setImageProgress,
      });
      setImageUpload(result);
      const previewUrl = safeDownloadUrl(result.url);
      if (previewUrl)
        change("screenshots", [...(values.screenshots || []), previewUrl]);
      return result;
    });
  }
  useEffect(() => {
    if (publishing) navigate("/workspace/projects");
  }, [publishing, navigate]);
  return (
    <>
      <PageTitle
        title={project ? "Edit your project" : "Create your next project"}
      >
        A clear preview, useful source, and terms buyers can understand.
      </PageTitle>
      <form
        ref={formRef}
        noValidate
        className="app-form app-card"
        onSubmit={submit}
        onInput={validation.onInput}
      >
        <FormValidationError validation={validation} />
        <TaskError error={task.error} />
        {saved && <Notice tone="success">Draft saved.</Notice>}
        {search.get("job") && (
          <Notice>
            Gemini output will be checked for publishing rights when you save.
          </Notice>
        )}
        <Field label="Project title">
          <input
            disabled={task.busy}
            required
            maxLength={120}
            value={values.title}
            onChange={(e) => change("title", e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            className="resize-none"
            disabled={task.busy}
            required
            rows={5}
            maxLength={10000}
            value={values.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </Field>
        <Field
          label="Stack"
          hint="Separate technologies with commas, for example React, Vite."
        >
          <input
            disabled={task.busy}
            required
            value={values.stack}
            onChange={(e) => change("stack", e.target.value)}
          />
        </Field>
        <Field
          label="Demo URL"
          hint="Optional. Add a link when your demo is ready."
        >
          <input
            disabled={task.busy}
            type="url"
            pattern="https?://.*"
            value={values.demoUrl}
            onChange={(e) => change("demoUrl", e.target.value)}
          />
        </Field>
        <section className="app-stack" aria-label="Project screenshots">
          <h2>Show your project</h2>
          <p className="app-muted">
            Add screenshots so buyers can see what they are getting.
          </p>
          <Field
            label="Upload screenshot"
            hint="PNG, JPEG, or WebP, up to 5 MB. Demo mode records image metadata only."
          >
            <input
              disabled={task.busy}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] || null);
                setImageUpload(null);
                setImageProgress(0);
              }}
            />
          </Field>
          <button
            type="button"
            className="app-button secondary"
            disabled={
              !imageFile || task.busy || (values.screenshots || []).length >= 8
            }
            onClick={uploadImage}
          >
            {task.busy ? "Working…" : "Upload screenshot"}
          </button>
          {task.busy && imageFile && (
            <progress
              aria-label="Screenshot upload progress"
              max={100}
              value={imageProgress}
            />
          )}
          {imageUpload && (
            <Notice tone="success">
              {imageUpload.demo
                ? "Screenshot metadata recorded for this demo. No image file is stored."
                : "Screenshot uploaded."}
            </Notice>
          )}
          {(values.screenshots || []).length > 0 && (
            <div className="app-grid">
              {values.screenshots.map((url, index) => (
                <figure key={url} style={{ margin: 0, minWidth: 0 }}>
                  <img
                    src={url}
                    alt={`${values.title || "Project"} screenshot ${index + 1}`}
                    loading="lazy"
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 10",
                      objectFit: "contain",
                      borderRadius: "var(--radius-small)",
                    }}
                  />
                  <figcaption>
                    <button
                      type="button"
                      disabled={task.busy}
                      className="app-button secondary"
                      onClick={() =>
                        change(
                          "screenshots",
                          values.screenshots.filter((item) => item !== url),
                        )
                      }
                    >
                      Remove screenshot {index + 1}
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
        <Field
          label={`Price in ${NATIVE_TOKEN_SYMBOL}`}
          hint="Up to 18 decimal places."
        >
          <input
            disabled={task.busy}
            required
            inputMode="decimal"
            pattern="[0-9]+(\.[0-9]{1,18})?"
            value={values.price}
            onChange={(e) => change("price", e.target.value)}
          />
        </Field>
        <Field label="License terms">
          <textarea
            className="resize-none"
            disabled={task.busy}
            required
            rows={4}
            value={values.license}
            onChange={(e) => change("license", e.target.value)}
          />
        </Field>
        {project?.status !== "published" && (
          <section className="app-stack">
            <h2>Source archive</h2>
            <Field
              label="Source ZIP"
              hint="ZIP archive, up to 100 MB. Never include credentials or private keys."
            >
              <input
                disabled={task.busy}
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  sourceUploadKey.current = null;
                  setUpload(null);
                  setProgress(0);
                }}
              />
            </Field>
            <button
              type="button"
              className="app-button secondary"
              disabled={task.busy || !file}
              onClick={uploadFile}
            >
              {task.busy ? "Working…" : "Upload source ZIP"}
            </button>
            {task.busy && file && (
              <progress
                aria-label="Source upload progress"
                max={100}
                value={progress <= 1 ? progress * 100 : progress}
              />
            )}
            {upload && <Notice tone="success">Source ZIP uploaded.</Notice>}
          </section>
        )}
        <div className="app-actions">
          <button className="app-button secondary" disabled={task.busy}>
            {task.busy ? "Saving…" : "Save draft"}
          </button>
          {project?.status !== "published" && (
            <button
              type="button"
              className="app-button"
              disabled={task.busy || !upload}
              onClick={publish}
            >
              Publish project
            </button>
          )}
          <Link to="/workspace/projects">Back to workspace</Link>
        </div>
      </form>
    </>
  );
}

export function ReleasePage() {
  const { projectId, id } = useParams();
  const { service, user } = useApp();
  const resource = useResource(
    () => service.call("projects.get", { id: projectId || id }),
    [service, projectId, id],
  );
  if (resource.loading) return <Loading />;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  if (!isOwner(user, resource.data))
    return (
      <Empty title="Only this project’s creator can add a release">
        <Link to="/workspace/projects">Return to your workspace</Link>
      </Empty>
    );
  if (resource.data.status !== "published")
    return (
      <Empty title="Publish this project first">
        <Link to={`/workspace/projects/${resource.data.id}/edit`}>
          Finish your draft
        </Link>
      </Empty>
    );
  return <ReleaseForm project={resource.data} />;
}

function ReleaseForm({ project }) {
  const { service } = useApp();
  const navigate = useNavigate();
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const uploadKey = useRef(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const task = useTask();
  const validation = useFormValidation();
  useDirtyGuard(Boolean(version || notes || file) && !done);
  async function submit(event) {
    event.preventDefault();
    if (!validation.validate(event.currentTarget)) return;
    const result = await task.run(async () => {
      const error = archiveError(file);
      if (error) throw new Error(error);
      const upload = await service.call("projects.upload", {
        projectId: project.id,
        file,
        version: version.trim(),
        idempotencyKey: (uploadKey.current ??= crypto.randomUUID()),
        onProgress: setProgress,
      });
      return service.mode === "demo"
        ? service.call("projects.release", {
            projectId: project.id,
            version: version.trim(),
            notes: notes.trim(),
            uploadId: upload.id || upload.uploadId,
          })
        : upload;
    });
    if (result) setDone(true);
  }
  useEffect(() => {
    if (done) navigate("/workspace/projects");
  }, [done, navigate]);
  return (
    <>
      <PageTitle title={`A new release for ${project.title}`}>
        Existing buyers receive updates under this listing without buying again.
      </PageTitle>
      <form
        noValidate
        className="app-form app-card"
        onSubmit={submit}
        onInput={validation.onInput}
      >
        <FormValidationError validation={validation} />
        <TaskError error={task.error} />
        <Field label="Version" hint="Use a unique version, for example 1.1.0.">
          <input
            disabled={task.busy}
            required
            maxLength={40}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </Field>
        {service.mode === "demo" && (
          <Field label="Release notes">
            <textarea
              className="resize-none"
              disabled={task.busy}
              required
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        )}
        <Field label="Updated source ZIP">
          <input
            disabled={task.busy}
            required
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              uploadKey.current = null;
            }}
          />
        </Field>
        {task.busy && (
          <progress
            aria-label="Release upload progress"
            max={100}
            value={progress <= 1 ? progress * 100 : progress}
          />
        )}
        <div className="app-actions">
          <button className="app-button" disabled={task.busy}>
            {task.busy ? "Publishing release…" : "Publish release"}
          </button>
          <Link to="/workspace/projects">Back to workspace</Link>
        </div>
      </form>
    </>
  );
}

export function CheckoutPage() {
  const { projectId } = useParams();
  const { service, user, mode } = useApp();
  const [search, setSearch] = useSearchParams();
  const offerId = search.get("offer");
  const purchaseId = search.get("purchase");
  const [purchase, setPurchase] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [receiptSaved, setReceiptSaved] = useState(false);
  const task = useTask();
  const idempotency = useRef(null);
  const resource = useResource(async () => {
    const [project, offer, entitlements] = await Promise.all([
      service.call("projects.get", { id: projectId }),
      offerId
        ? service.call("resales.get", { id: offerId })
        : Promise.resolve(null),
      !offerId ? service.call("library.list") : Promise.resolve([]),
    ]);
    if (offer && (offer.projectId || offer.project?.id) !== projectId)
      throw new Error("This resale offer belongs to another project.");
    const ownedEntitlement = entitlements.find(
      (item) =>
        (item.projectId || item.project?.id) === projectId &&
        !["transferred", "revoked", "expired", "inactive"].includes(
          item.status,
        ),
    );
    return { project, offer, ownedEntitlement };
  }, [service, projectId, offerId]);
  useEffect(() => {
    idempotency.current = crypto.randomUUID();
    setPurchase(null);
    setAccepted(false);
  }, [projectId, offerId]);
  useEffect(() => {
    if (!purchaseId) return;
    try {
      setReceiptSaved(
        Boolean(paymentReceipt(window.sessionStorage, purchaseId)),
      );
    } catch (error) {
      setPollError(error);
    }
    let active = true;
    let timer;
    async function check() {
      setChecking(true);
      try {
        const result = await service.call("purchases.get", { id: purchaseId });
        if (!active) return;
        assertPurchaseBinding(result, { projectId, offerId, purchaseId });
        setPurchase((previous) =>
          previous?.id === result.id &&
          previous.status === "confirmed" &&
          result.status === "pending"
            ? previous
            : {
                ...result,
                ...(result.status === "pending" &&
                !result.walletRequest &&
                previous?.id === result.id &&
                previous.walletRequest
                  ? { walletRequest: previous.walletRequest }
                  : {}),
              },
        );
        setPollError(null);
        if (result.status === "pending") timer = setTimeout(check, 3000);
      } catch (error) {
        if (active) setPollError(error);
      } finally {
        if (active) setChecking(false);
      }
    }
    check();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [service, purchaseId, projectId, offerId]);
  async function buy() {
    await task.run(async () => {
      let result = await service.call("purchases.create", {
        projectId,
        ...(offerId ? { offerId } : {}),
        idempotencyKey: idempotency.current,
      });
      assertPurchaseBinding(result, { projectId, offerId });
      setPurchase(result);
      setSearch(
        (old) => {
          const next = new URLSearchParams(old);
          next.set("purchase", result.id);
          return next;
        },
        { replace: true },
      );
      if (result.walletRequest) await completePayment(result);
    });
  }
  async function recheck() {
    const result = await task.run(async () =>
      assertPurchaseBinding(
        await service.call("purchases.get", { id: purchaseId }),
        { projectId, offerId, purchaseId },
      ),
    );
    if (result) {
      setPurchase(result);
      setPollError(null);
    }
  }
  async function resumePayment() {
    await task.run(() => completePayment(purchase));
  }
  async function completePayment(current) {
    try {
      assertPurchaseBinding(current, {
        projectId,
        offerId,
        purchaseId: current.id,
      });
      const result = await finishWalletPurchase({
        purchase: current,
        provider: window.ethereum,
        service,
        storage: window.sessionStorage,
        onReceipt: () => setReceiptSaved(true),
      });
      assertPurchaseBinding(result, {
        projectId,
        offerId,
        purchaseId: current.id,
      });
      setPurchase(result);
      if (result.status === "confirmed") setReceiptSaved(false);
    } catch (error) {
      throw walletError(error);
    }
  }
  if (resource.loading) return <Loading>Preparing checkout…</Loading>;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  const { project, offer, ownedEntitlement } = resource.data;
  const units = offer?.priceUnits || project.priceUnits;
  const split = splitSale(priceText(units));
  const own = isOwner(user, project) || offer?.sellerId === user?.id;
  const unavailable =
    project.status !== "published" ||
    (offer && !["active", "open"].includes(offer.status));
  const confirmed = purchase?.status === "confirmed";
  const pending = purchase?.status === "pending";
  return (
    <>
      <PageTitle
        title={confirmed ? "Your project is ready" : "Review your purchase"}
      >
        {mode === "demo"
          ? `Demo checkout · simulated ${NATIVE_TOKEN_SYMBOL} · no real transaction`
          : `${NETWORK_NAME} · ${NATIVE_TOKEN_SYMBOL}`}
      </PageTitle>
      <div className="app-grid">
        <section className="app-card app-stack">
          <h2>{project.title}</h2>
          <p>{project.description}</p>
          {offer && (
            <Notice>
              This purchase transfers an existing license. The seller’s
              transferred access ends when confirmed.
            </Notice>
          )}
          <Rights project={{ ...project, ...offer?.terms }} />
          <p className="app-muted">
            Includes source access and future updates under this listing. Gemini
            credits are separate.
          </p>
        </section>
        <section className="app-card app-stack">
          <h2>{confirmed ? "Purchase confirmed" : "Order summary"}</h2>
          <div className="app-order-total">
            <p className="app-muted">Total</p>
            <p className="app-large-price">
              {priceText(units)} <small>{NATIVE_TOKEN_SYMBOL}</small>
            </p>
          </div>
          <dl className="app-list">
            <div>
              <dt>Seller receives</dt>
              <dd>
                {formatAvax(split.seller)} {NATIVE_TOKEN_SYMBOL}
              </dd>
            </div>
            <div>
              <dt>Platform share (10%)</dt>
              <dd>
                {formatAvax(split.platform)} {NATIVE_TOKEN_SYMBOL}
              </dd>
            </div>
            <div className="app-list-prose">
              <dt>Purchase gas</dt>
              <dd>Covered by the platform share</dd>
            </div>
          </dl>
          <TaskError error={task.error || pollError} />
          {confirmed ? (
            <>
              <Notice tone="success">
                {mode === "demo"
                  ? "Demo purchase confirmed. Demo source files are unavailable."
                  : "Payment and access were confirmed by the service."}
              </Notice>
              <Link className="app-button" to="/library">
                Open your library
              </Link>
            </>
          ) : pending || (purchaseId && !purchase) ? (
            <>
              <Notice>
                {checking
                  ? "Checking your purchase…"
                  : "Your purchase is pending. Keep this page or return using this URL to check its status."}
              </Notice>
              {(purchase?.walletRequest || receiptSaved) && (
                <button
                  className="app-button"
                  disabled={task.busy}
                  onClick={resumePayment}
                >
                  {task.busy
                    ? "Waiting for wallet…"
                    : receiptSaved
                      ? "Retry payment confirmation"
                      : "Continue wallet payment"}
                </button>
              )}
              <button
                className="app-button secondary"
                disabled={task.busy || checking}
                onClick={recheck}
              >
                Check purchase status
              </button>
            </>
          ) : purchase?.status === "failed" ? (
            <>
              <Notice tone="error">
                This purchase failed. No access has been confirmed.
              </Notice>
              <button
                className="app-button secondary"
                onClick={() => {
                  idempotency.current = crypto.randomUUID();
                  setPurchase(null);
                  setSearch((old) => {
                    const next = new URLSearchParams(old);
                    next.delete("purchase");
                    return next;
                  });
                }}
              >
                Start a new purchase
              </button>
            </>
          ) : ownedEntitlement && !offer ? (
            <>
              <Notice>
                Already in your library. Your existing license includes this
                project’s published updates.
              </Notice>
              <Link
                className="app-button"
                to={`/library/${ownedEntitlement.id}`}
              >
                Open project in library
              </Link>
            </>
          ) : own ? (
            <Notice>
              You already own this listing or offer. Choose another project to
              purchase.
            </Notice>
          ) : unavailable ? (
            <Notice>This listing or offer is no longer available.</Notice>
          ) : (
            <>
              <label>
                <input
                  disabled={task.busy}
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />{" "}
                I have reviewed the license and permissions.
              </label>
              <button
                className="app-button"
                disabled={!accepted || task.busy}
                onClick={buy}
              >
                {task.busy
                  ? "Creating purchase…"
                  : mode === "demo"
                    ? "Confirm demo purchase"
                    : "Continue to payment"}
              </button>
            </>
          )}
        </section>
      </div>
    </>
  );
}

export function LibraryPage() {
  const { service } = useApp();
  const resource = useResource(() => service.call("library.list"), [service]);
  return (
    <>
      <PageTitle title="Your project library">
        The source, updates, and permissions for the projects you own.
      </PageTitle>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : resource.data?.length ? (
        <div className="app-grid">
          {resource.data.map((item) => (
            <article className="app-card app-stack" key={item.id}>
              <h2>{item.project?.title || item.title || "Project license"}</h2>
              <p>{item.project?.description}</p>
              <span className="app-badge">
                {item.status || "Active license"}
              </span>
              <Link className="app-button secondary" to={`/library/${item.id}`}>
                View source and license
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Your next build is waiting">
          <p>Purchase a project to find its source and updates here.</p>
          <Link className="app-button" to="/explore">
            Explore projects
          </Link>
        </Empty>
      )}
    </>
  );
}

export function EntitlementPage() {
  const { entitlementId, id } = useParams();
  const { service } = useApp();
  const resource = useResource(
    () => service.call("library.get", { id: entitlementId || id }),
    [service, entitlementId, id],
  );
  if (resource.loading) return <Loading>Checking your source access…</Loading>;
  if (resource.error)
    return (
      <ErrorState
        error={resource.error}
        retry={resource.reload}
        context="license-access"
      />
    );
  return (
    <EntitlementDetail
      key={resource.data.id}
      entitlement={resource.data}
      reload={resource.reload}
    />
  );
}

function EntitlementDetail({ entitlement, reload }) {
  const { service } = useApp();
  const project = entitlement.project;
  const purchasedTerms = {
    ...project,
    resaleAllowed: entitlement.resaleAllowed ?? project.resaleAllowed,
    derivativeAllowed:
      entitlement.derivativeAllowed ?? project.derivativeAllowed,
    license: entitlement.license ?? project.license,
  };
  const [releaseId, setReleaseId] = useState(
    project.latestReleaseId || project.releases?.[0]?.id || "",
  );
  const [download, setDownload] = useState(null);
  const [resalePrice, setResalePrice] = useState("");
  const [offer, setOffer] = useState(null);
  const task = useTask();
  const validation = useFormValidation();
  const active = !["transferred", "revoked", "expired", "inactive"].includes(
    entitlement.status,
  );
  async function getDownload() {
    setDownload(null);
    const result = await task.run(() =>
      service.call("library.download", { id: entitlement.id, releaseId }),
    );
    if (result) setDownload(result);
  }
  async function resale(event) {
    event.preventDefault();
    if (!validation.validate(event.currentTarget)) return;
    const result = await task.run(() =>
      service.call("resales.create", {
        entitlementId: entitlement.id,
        priceUnits: priceUnits(resalePrice),
      }),
    );
    if (result) setOffer(result);
  }
  const url = safeDownloadUrl(download?.url);
  return (
    <>
      <PageTitle
        title={project.title}
        actions={
          <Link className="app-button secondary" to="/library">
            Back to library
          </Link>
        }
      >
        Your license and source releases, in one place.
      </PageTitle>
      <TaskError error={task.error} />
      {!active && (
        <Notice>
          This license is {entitlement.status}. Source access and resale are
          unavailable.{" "}
          <button className="app-button secondary" onClick={reload}>
            Check access again
          </button>
        </Notice>
      )}
      <div className="app-grid">
        <section className="app-card app-stack">
          <h2>Source and updates</h2>
          <p>
            Updates published under this listing are included in your purchase.
          </p>
          {project.releases?.length ? (
            <Field label="Release">
              <select
                value={releaseId}
                onChange={(e) => {
                  setReleaseId(e.target.value);
                  setDownload(null);
                }}
              >
                {project.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.version || release.id}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="app-muted">No release details are available.</p>
          )}
          <button
            className="app-button"
            disabled={!active || task.busy}
            onClick={getDownload}
          >
            {task.busy ? "Checking access…" : "Prepare source download"}
          </button>
          {download &&
            (download.unavailable || !url ? (
              <Notice>
                {download.message ||
                  "The source download is not available. Try again later."}
              </Notice>
            ) : (
              <a
                className="app-button secondary"
                href={url}
                download={download.filename || undefined}
                rel="noreferrer"
              >
                Download {download.filename || "source ZIP"}
              </a>
            ))}
          {purchasedTerms.derivativeAllowed && active && (
            <Link className="app-button secondary" to="/gemini">
              Build with Gemini
            </Link>
          )}
        </section>
        <section className="app-card app-stack">
          <h2>Your permissions</h2>
          <Rights project={purchasedTerms} />
          {purchasedTerms.resaleAllowed && active ? (
            offer ? (
              <>
                <Notice tone="success">Your resale offer is listed.</Notice>
                <Link className="app-button" to={`/resales/${offer.id}`}>
                  View resale offer
                </Link>
              </>
            ) : (
              <form
                noValidate
                className="app-form"
                onSubmit={resale}
                onInput={validation.onInput}
              >
                <FormValidationError validation={validation} />
                <h3>Resell your license</h3>
                <p className="app-muted">
                  The transferred license and its future updates move to the
                  buyer. Copies already downloaded cannot be recalled.
                </p>
                <Field label={`Resale price in ${NATIVE_TOKEN_SYMBOL}`}>
                  <input
                    disabled={task.busy}
                    required
                    inputMode="decimal"
                    pattern="[0-9]+(\.[0-9]{1,18})?"
                    value={resalePrice}
                    onChange={(e) => setResalePrice(e.target.value)}
                  />
                </Field>
                <button className="app-button secondary" disabled={task.busy}>
                  Create resale offer
                </button>
              </form>
            )
          ) : (
            <p className="app-muted">
              This license cannot currently be resold.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

export function ResalePage() {
  const { offerId, id } = useParams();
  const { service, user } = useApp();
  const resource = useResource(
    () => service.call("resales.get", { id: offerId || id }),
    [service, offerId, id],
  );
  if (resource.loading) return <Loading>Loading resale offer…</Loading>;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  const offer = resource.data;
  const project = offer.project;
  return (
    <>
      <PageTitle title="A license, ready for its next builder">
        Purchase an existing license under the creator’s original terms.
      </PageTitle>
      <section className="app-card app-stack">
        <h2>{project.title}</h2>
        <p>{project.description}</p>
        <p className="app-price">
          {priceText(offer.priceUnits)} <small>{NATIVE_TOKEN_SYMBOL}</small>
        </p>
        <Rights project={{ ...project, ...offer.terms }} />
        <Notice>
          The seller’s transferred access ends when the purchase is confirmed.
          This is an original license transfer, separate from permission to sell
          derivative work.
        </Notice>
        {!["active", "open"].includes(offer.status) ? (
          <Notice>This offer is {offer.status} and cannot be purchased.</Notice>
        ) : offer.sellerId === user?.id ? (
          <Notice>This is your resale offer.</Notice>
        ) : (
          <Link
            className="app-button"
            to={`/checkout/${project.id}?offer=${encodeURIComponent(offer.id)}`}
          >
            Review purchase
          </Link>
        )}
        <Link to={`/projects/${project.id}`}>View original project</Link>
      </section>
    </>
  );
}
