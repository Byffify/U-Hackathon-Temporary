import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp } from "../app/AppContext.jsx";
import {
  Empty,
  ErrorState,
  Notice,
  PageTitle,
  ProjectCard,
  ProjectVisual,
  useResource,
} from "../app/ui.jsx";

import { formatAvax } from "../utils/pricing.js";
import { externalUrl } from "../app/navigation.js";

export function ExplorePage() {
  const { service } = useApp();
  const [search, setSearch] = useSearchParams();
  const q = search.get("q") || "",
    stack = search.get("stack") || "",
    page = Math.max(1, Number(search.get("page")) || 1);
  const result = useResource(
    () => service.call("explore.list", { q, stack, page }),
    [q, stack, page],
  );
  function update(key, value) {
    setSearch((old) => {
      const next = new URLSearchParams(old);
      value ? next.set(key, value) : next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  }
  return (
    <>
      <PageTitle title="Find your next starting point.">
        Independent websites. Useful source. Something to build on.
      </PageTitle>
      <form
        noValidate
        className="app-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setSearch({ q: data.get("q"), stack: data.get("stack") });
        }}
      >
        <label className="app-field">
          Search projects
          <input
            key={q}
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Storefront, dashboard, portfolio…"
          />
        </label>
        <label className="app-field">
          Technology
          <select
            name="stack"
            value={stack}
            onChange={(e) => update("stack", e.target.value)}
          >
            <option value="">All technologies</option>
            {["React", "Next.js", "Vue"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="app-button">Search</button>
        {(q || stack) && (
          <button
            className="app-button secondary"
            type="button"
            onClick={() => setSearch({})}
          >
            Clear filters
          </button>
        )}
      </form>
      {result.loading ? (
        <p role="status">Finding projects…</p>
      ) : result.error ? (
        <ErrorState error={result.error} retry={result.reload} />
      ) : (
        <>
          <div className="app-results-meta">
            <p>
              {result.data.total}{" "}
              {result.data.total === 1 ? "project" : "projects"} to explore
            </p>
            <span>Try the demo. Read the terms. Make it yours.</span>
          </div>
          {result.data.items.length ? (
            <div className="app-grid">
              {result.data.items.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <Empty title="No projects match yet">
              Try another search or clear your filters.
            </Empty>
          )}
          <nav className="app-pagination" aria-label="Project pages">
            <button
              className="app-button secondary"
              disabled={page <= 1}
              onClick={() => update("page", String(page - 1))}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="app-button secondary"
              disabled={page * result.data.pageSize >= result.data.total}
              onClick={() => update("page", String(page + 1))}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { service, user } = useApp();
  const owned = useResource(
    () => (user ? service.call("library.list") : []),
    [user?.id],
  );
  const result = useResource(
    () => service.call("explore.get", { id: projectId }),
    [projectId],
  );
  if (result.loading) return <p role="status">Loading project…</p>;
  if (result.error)
    return <ErrorState error={result.error} retry={result.reload} />;
  const p = result.data;
  const demo = externalUrl(p.demoUrl);
  return (
    <>
      <Link className="app-back" to="/explore">
        Back to Explore
      </Link>
      <PageTitle title={p.title}>
        {p.isExample ? (
          <>By {p.creator}</>
        ) : (
          <Link to={`/creators/${p.creatorId}`}>By {p.creator}</Link>
        )}{" "}
        · {p.stack}
      </PageTitle>
      {p.isExample && (
        <Notice>
          This is an example project. It has no source archive or on-chain
          listing yet.
        </Notice>
      )}
      <div className="app-detail-grid">
        <div className="app-stack">
          <div className={`app-detail-art ${p.tone || "aqua"}`}>
            <ProjectVisual project={p} />
          </div>
          {p.screenshots?.length > 0 && (
            <div className="app-grid">
              {p.screenshots.map(
                (src, i) =>
                  externalUrl(src) && (
                    <img
                      key={src}
                      src={src}
                      alt={`${p.title} screenshot ${i + 1}`}
                    />
                  ),
              )}
            </div>
          )}
          <section>
            <h2>About this project</h2>
            <p className="app-prose">{p.description}</p>
            {p.isExample && <>
              <p className="app-muted">{p.type}</p>
              <ul>{p.features?.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </>}
          </section>
          {!p.isExample && <section>
            <h2>Releases</h2>
            {p.releases?.map((r) => (
              <div key={r.id} className="app-release">
                <strong>{r.version}</strong>
                <p>{r.notes || "Source project release."}</p>
              </div>
            ))}
          </section>}
        </div>
        <aside className="app-card app-purchase-panel">
          <span className="app-badge">{p.stack}</span>
          {p.isExample ? (
            <>
              <p className="app-large-price">
                {formatAvax(BigInt(p.priceUnits))}
                <small>test AVAX · example price</small>
              </p>
              <p>Preview only. Purchase is unavailable.</p>
            </>
          ) : (
            <>
              <p className="app-large-price">
                {formatAvax(BigInt(p.priceUnits))}
                <small>test AVAX</small>
              </p>
              <p>Source ZIP · Updates included</p>
            </>
          )}
          <hr />
          <h2>Your license</h2>
          <p className="app-prose">{p.license}</p>
          <ul className="app-rights">
            <li>
              Original license resale:{" "}
              <strong>{p.resaleAllowed ? "Allowed" : "Not allowed"}</strong>
            </li>
            <li>
              Derivative sales:{" "}
              <strong>{p.derivativeAllowed ? "Allowed" : "Not allowed"}</strong>
            </li>
          </ul>
          {!p.isExample && (
            <Link
              className="app-button"
              to={
                owned.data?.find((e) => e.projectId === p.id)
                  ? `/library/${owned.data.find((e) => e.projectId === p.id).id}`
                  : `/checkout/${p.id}`
              }
            >
              {owned.data?.some((e) => e.projectId === p.id)
                ? "Open in your library"
                : "Review purchase"}
            </Link>
          )}
          {demo ? (
            <a
              className="app-button secondary"
              href={demo}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open live demo ↗
            </a>
          ) : (
            <Notice>No live demo has been supplied.</Notice>
          )}
          {!p.isExample && (
            <p className="app-muted">
              Fuji testnet. Platform covers purchase gas. You install and deploy
              the source yourself.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

export function CreatorProfilePage() {
  const { creatorId } = useParams();
  const { service } = useApp();
  const [search, setSearch] = useSearchParams();
  const page = Math.max(1, Number(search.get("page")) || 1);
  const result = useResource(
    async () => ({
      profile: await service.call("profiles.get", { id: creatorId }),
      projects: await service.call("projects.list", { creatorId, page }),
    }),
    [creatorId, page],
  );
  if (result.loading) return <p role="status">Loading creator…</p>;
  if (result.error)
    return <ErrorState error={result.error} retry={result.reload} />;
  const { profile, projects } = result.data;
  return (
    <>
      <Link className="app-back" to="/explore">
        Back to Explore
      </Link>
      <div className="app-profile-header">
        <div className="app-avatar" aria-hidden="true">
          {externalUrl(profile.avatarUrl) ? (
            <img src={externalUrl(profile.avatarUrl)} alt="" />
          ) : (
            profile.name?.slice(0, 2).toUpperCase()
          )}
        </div>
        <PageTitle title={profile.name}>{profile.bio}</PageTitle>
      </div>
      <h2>Projects by {profile.name}</h2>
      {projects.items.length ? (
        <div className="app-grid">
          {projects.items.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Empty title="A new beginning">
          This creator has not published projects yet.
        </Empty>
      )}
      <nav className="app-pagination" aria-label="Creator project pages">
        <button
          className="app-button secondary"
          disabled={page <= 1}
          onClick={() => setSearch({ page: String(page - 1) })}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="app-button secondary"
          disabled={page * projects.pageSize >= projects.total}
          onClick={() => setSearch({ page: String(page + 1) })}
        >
          Next
        </button>
      </nav>
    </>
  );
}
export function NotFoundPage() {
  return (
    <Empty title="This page is still a blank canvas.">
      <p>The address does not match a page in U-topia.</p>
      <Link className="app-button" to="/explore">
        Explore projects
      </Link>
    </Empty>
  );
}
