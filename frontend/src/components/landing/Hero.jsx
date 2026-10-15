import { HeroOrbit } from "./ProjectArt.jsx";
export default function Hero({ actions }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <HeroOrbit />
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="tiny-star" aria-hidden="true">
            ✳
          </span>{" "}
          A NEW HOME FOR WHAT YOU BUILD
        </p>
        <h1 id="hero-title">
          Good work deserves
          <br />a{" "}
          <span className="highlight-word">
            next chapter.
            <svg
              viewBox="0 0 400 20"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M4 13Q190-5 395 8M15 18Q210 3 380 14" />
            </svg>
          </span>
        </h1>
        <p className="hero-description">
          Your side project. Someone else’s starting point.
          <br />
          Show your websites, sell the source, and keep creating.
        </p>
        <div className="cta-row">
          <button
            className="button button-dark"
            type="button"
            onClick={() => actions.openStart("hero")}
          >
            Start creating <span aria-hidden="true">↗</span>
          </button>
          <button
            className="button button-outline"
            type="button"
            onClick={() => actions.openExplore()}
          >
            Explore projects <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="hero-footnote">
          <span className="mini-avatars" aria-hidden="true">
            <span>M</span>
            <span>L</span>
            <span>A</span>
          </span>
          <span>
            Made for independent minds.
            <br />
            <strong>Built around your work.</strong>
          </span>
        </div>
      </div>
      <a className="scroll-cue" href="#creators">
        <span>MEET YOUR NEXT CHAPTER</span>
        <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
