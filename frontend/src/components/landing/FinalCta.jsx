import { Link } from "react-router-dom";
import { useApp } from "../../app/AppContext.jsx";

export default function FinalCta() {
  const { user } = useApp();
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
          <Link
            className="button button-lime"
            to={
              user
                ? "/workspace/projects"
                : "/connect?returnTo=/workspace/projects"
            }
          >
            {user ? "My workspace" : "Connect wallet"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <span className="final-loop" aria-hidden="true">
          ↝
        </span>
      </div>
    </section>
  );
}
