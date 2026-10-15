import { projects } from "../../data/creatorExamples.js";

export function ProjectArt({ id }) {
  if (id === "flora")
    return (
      <div className="project-art art-flora">
        <div className="mock-nav">
          <b>
            flora<span>✳</span>
          </b>
          <span>Plants &nbsp; Our story &nbsp; Bag (0)</span>
        </div>
        <div className="flora-heading">
          A little green.
          <br />A little more life.
        </div>
        <div className="flora-bottom">
          <span className="mini-shop-pill">Find your plant ↗</span>
          <div className="plant plant-a">
            <i />
            <i />
            <i />
            <i />
            <span />
          </div>
          <div className="plant plant-b">
            <i />
            <i />
            <i />
            <i />
            <span />
          </div>
        </div>
        <span className="art-caption">GOOD THINGS GROW HERE.</span>
      </div>
    );
  if (id === "orbit")
    return (
      <div className="project-art art-orbit">
        <div className="orbit-sidebar">
          <b>o.</b>
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="orbit-main">
          <div className="mock-nav">
            <b>Your overview</b>
            <span>↗</span>
          </div>
          <span className="mock-muted">A little more clarity.</span>
          <div className="mock-metrics">
            <div>
              <small>Overview</small>
              <b>Keep growing.</b>
            </div>
            <span className="orbit-symbol">✳</span>
          </div>
          <div className="chart-bars">
            {[30, 50, 40, 70, 55, 80, 64, 96, 79, 112, 103, 130].map((h, i) => (
              <i
                key={i}
                style={{ "--bar-height": `${h}px` }}
                className={i > 7 ? "bar-emphasis" : ""}
              />
            ))}
          </div>
          <div className="chart-axis">
            <span>MON</span>
            <span>WED</span>
            <span>FRI</span>
            <span>SUN</span>
          </div>
        </div>
      </div>
    );
  return (
    <div className="project-art art-folio">
      <div className="mock-nav">
        <b>aria / studio</b>
        <span>WORK &nbsp; ABOUT &nbsp; ↗</span>
      </div>
      <div className="folio-heading">
        Good ideas.
        <br />
        <span>Real things.</span>
      </div>
      <div className="folio-flower" aria-hidden="true">
        ✳
      </div>
      <div className="folio-baseline">
        <span>
          INDEPENDENT CREATIVE
          <br />
          DEVELOPER & DESIGNER
        </span>
        <span>SELECTED WORK ↓</span>
      </div>
    </div>
  );
}

export function ProjectCard({ project, onProject }) {
  return (
    <article className="project-card">
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
        <ProjectArt id="flora" />
        <div className="floating-caption">
          <span>flora / storefront</span>
          <span>React ↗</span>
        </div>
      </div>
      <div className="floating-project hero-orbit-card">
        <ProjectArt id="orbit" />
        <div className="floating-caption">
          <span>orbit / dashboard</span>
          <span>Next.js ↗</span>
        </div>
      </div>
      <div className="floating-project hero-folio">
        <ProjectArt id="folio" />
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
