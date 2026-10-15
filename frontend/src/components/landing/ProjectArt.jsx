import { projects } from "../../data/creatorExamples.js";

export function ProjectArt({ id, loading = "lazy" }) {
  const project = projects.find((item) => item.id === id);
  if (!project) return null;
  return (
    <div className="project-art project-screenshot">
      <img
        src={`/images/projects/${id}.png`}
        alt={`${project.title} website screenshot`}
        width="1024"
        height="572"
        loading={loading}
        decoding="async"
      />
    </div>
  );
}

export function ProjectCard({ project, onProject }) {
  return (
    <article className="project-card">
      {onProject ? (
        <button
          className="project-preview"
          type="button"
          onClick={() => onProject(project.id)}
          aria-label={`Preview ${project.title}`}
        >
          <ProjectArt id={project.id} />
          <span className="preview-project-label">
            View example <span aria-hidden="true">↗</span>
          </span>
        </button>
      ) : (
        <div className="project-preview">
          <ProjectArt id={project.id} />
        </div>
      )}
      <div className="project-meta">
        <div>
          <h4>{project.title}</h4>
          <span>
            {project.type} · {project.stack}
          </span>
        </div>
        <span className="project-price">
          {project.price}
          <small>test AVAX</small>
        </span>
      </div>
    </article>
  );
}

export function HeroOrbit() {
  return (
    <div className="hero-orbit" aria-hidden="true">
      <div className="floating-project hero-flora">
        <ProjectArt id="flora" loading="eager" />
        <div className="floating-caption">
          <span>flora / storefront</span>
          <span>React ↗</span>
        </div>
      </div>
      <div className="floating-project hero-orbit-card">
        <ProjectArt id="orbit" loading="eager" />
        <div className="floating-caption">
          <span>orbit / dashboard</span>
          <span>Next.js ↗</span>
        </div>
      </div>
      <div className="floating-project hero-folio">
        <ProjectArt id="folio" loading="eager" />
        <div className="floating-caption">
          <span>studio / portfolio</span>
          <span>Vue ↗</span>
        </div>
      </div>
      <div className="hero-file">
        <span className="file-icon">{"{ }"}</span>
        <div>
          <strong>a-good-idea.zip</strong>
          <span>Built to become something.</span>
        </div>
        <span>↗</span>
      </div>
      <span className="hero-doodle doodle-a">✳</span>
      <span className="hero-doodle doodle-b">↝</span>
    </div>
  );
}

export function ProfileArtwork() {
  return (
    <div className="feature-art profile-art">
      <div className="mini-profile">
        <div className="mini-profile-cover">
          <span>
            MAKE
            <br />
            SOMETHING
            <br />
            MATTER.
          </span>
          <span>✳</span>
        </div>
        <div className="mini-profile-person">
          <span className="profile-avatar lilac">MC</span>
          <div>
            <h3>Maya Chen</h3>
            <span>Frontend developer</span>
          </div>
          <span className="tag">Example</span>
        </div>
        <div className="mini-profile-projects">
          {projects
            .filter((p) => p.id !== "orbit")
            .map((p) => (
              <ProjectArt key={p.id} id={p.id} />
            ))}
        </div>
      </div>
      <span className="floating-label profile-label">
        Your own corner of the internet. ↗
      </span>
    </div>
  );
}
