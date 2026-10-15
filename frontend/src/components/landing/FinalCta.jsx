export default function FinalCta({ actions }) {
  return (
    <section className="container final-section">
      <div className="final-cta">
        <span className="final-doodle" aria-hidden="true">
          ✳
        </span>
        <p className="eyebrow">YOU’VE ALREADY MADE SOMETHING GOOD.</p>
        <h2>
          Let’s see where
          <br />
          it goes next.
        </h2>
        <p>
          Give your project a home.
          <br />
          Give someone else a head start.
        </p>
        <div className="cta-row">
          <button
            className="button button-lime"
            type="button"
            onClick={() => actions.openStart("footer")}
          >
            Start creating <span aria-hidden="true">↗</span>
          </button>
          <button
            className="button button-on-dark"
            type="button"
            onClick={() => actions.openExplore()}
          >
            Explore projects <span aria-hidden="true">↗</span>
          </button>
        </div>
        <span className="final-loop" aria-hidden="true">
          ↝
        </span>
      </div>
    </section>
  );
}
