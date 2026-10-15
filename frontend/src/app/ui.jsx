import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker } from "react-router-dom";
import { ProjectArt } from "../components/landing/ProjectArt.jsx";
import { formatAvax } from "../utils/pricing.js";
import { externalUrl } from "./navigation.js";

export function PageTitle({ title, children, actions }) {
  return (
    <div className="app-page-title">
      <div>
        <h1>{title}</h1>
        {children && <div className="app-muted app-intro">{children}</div>}
      </div>
      {actions && <div className="app-actions">{actions}</div>}
    </div>
  );
}
export function Notice({ children, tone = "info" }) {
  return (
    <div
      className={`app-notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="app-empty">
      <h2>{title}</h2>
      <div className="app-muted">{children}</div>
    </div>
  );
}
export function ErrorState({ error, retry, context }) {
  const licenseAccess = context === "license-access";
  const status = error?.status ?? error?.details?.status;
  const unavailable =
    licenseAccess &&
    (["FORBIDDEN", "NOT_FOUND", "HTTP_403", "HTTP_404"].includes(error?.code) ||
      [403, 404].includes(Number(status)));
  return (
    <Notice tone="error">
      <p>
        {unavailable
          ? "This license is not available to this account."
          : error?.message || "This information could not be loaded."}
      </p>
      {unavailable && (
        <p>
          Check that you are using the same account you used to purchase this
          license.
        </p>
      )}
      {retry && !unavailable && (
        <button className="app-button secondary" onClick={retry}>
          Try again
        </button>
      )}
      {licenseAccess && (
        <Link className="app-button secondary" to="/library">
          Back to library
        </Link>
      )}
    </Notice>
  );
}
export function ProjectVisual({ project }) {
  const screenshot = project.screenshots?.map(externalUrl).find(Boolean);
  if (screenshot)
    return (
      <img
        className="app-project-image"
        src={screenshot}
        alt={`${project.title} preview`}
      />
    );
  return ["flora", "orbit", "folio"].includes(project.id) ? (
    <ProjectArt id={project.id} />
  ) : (
    <div className="app-project-placeholder">
      <strong>{project.title}</strong>
      <span>{project.stack}</span>
    </div>
  );
}
export function ProjectCard({ project }) {
  return (
    <article className="app-project-card">
      <Link
        to={`/projects/${project.id}`}
        className={`app-project-art ${project.tone || "aqua"}`}
        aria-label={`View ${project.title}`}
      >
        <ProjectVisual project={project} />
      </Link>
      <div className="app-project-copy">
        <div className="app-actions">
          <span className="app-badge">{project.stack}</span>
          <span className="app-price">
            {formatAvax(BigInt(project.priceUnits || "0"))} test AVAX
          </span>
        </div>
        <h2>
          <Link to={`/projects/${project.id}`}>{project.title}</Link>
        </h2>
        <p className="app-muted">{project.description}</p>
        <Link
          className="app-creator-link"
          to={`/creators/${project.creatorId}`}
        >
          {project.creator}
        </Link>
      </div>
    </article>
  );
}
export function useResource(loader, deps = []) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState((old) => ({ ...old, error: null, loading: true }));
    Promise.resolve()
      .then(loader)
      .then(
        (data) => {
          if (active) setState({ data, error: null, loading: false });
        },
        (error) => {
          if (active) setState({ data: null, error, loading: false });
        },
      );
    return () => {
      active = false;
    };
  }, [...deps, revision]);
  return { ...state, reload: useCallback(() => setRevision((n) => n + 1), []) };
}
export function useTask() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  const lock = useRef(false);
  const run = useCallback(async (fn) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e);
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return { run, busy, error };
}
export function useDirtyGuard(dirty) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const leave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const trigger = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.className = "app-leave-dialog";
    const title = document.createElement("h2");
    title.id = "leave-dialog-title";
    title.textContent = "Leave without saving?";
    dialog.setAttribute("aria-labelledby", title.id);
    const text = document.createElement("p");
    text.textContent = "Your unsaved changes will be lost.";
    const stay = document.createElement("button");
    stay.className = "app-button";
    stay.textContent = "Keep editing";
    const leave = document.createElement("button");
    leave.className = "app-button secondary";
    leave.textContent = "Discard changes";
    const close = (proceed) => {
      dialog.close();
      proceed ? blocker.proceed() : blocker.reset();
      trigger?.focus();
    };
    stay.onclick = () => close(false);
    leave.onclick = () => close(true);
    dialog.oncancel = (e) => {
      e.preventDefault();
      close(false);
    };
    dialog.append(title, text, stay, leave);
    document.body.append(dialog);
    dialog.showModal();
    stay.focus();
    return () => dialog.remove();
  }, [blocker]);
}
