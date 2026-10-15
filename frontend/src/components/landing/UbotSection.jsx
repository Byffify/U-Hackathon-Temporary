import { Link } from "react-router-dom";
export default function UbotSection({ actions }) {
  return (
    <section
      className="section container ubot-section"
      id="u-bot"
      aria-labelledby="ubot-title"
    >
      <div className="ubot-panel">
        <div className="ubot-copy">
          <p className="eyebrow">
            <span aria-hidden="true">✳</span> BUILD WITH GEMINI
          </p>
          <h2 id="ubot-title">
            A little of this.
            <br />A little of that.
            <br />
            <span>Something yours.</span>
          </h2>
          <p>
            Talk through your source. Improve one project or bring several
            together. Review a plan before creating something new.
          </p>
          <p className="small-text">
            Choose one or more projects you can use. Trial quota is per account;
            no daily reset or top-ups.
          </p>
        </div>
        <div className="composition-card app-stack">
          <h3>Your source. A conversation. A new direction.</h3>
          <div className="gemini-message from-user">
            <p>Help me adapt this storefront for a small plant shop.</p>
          </div>
          <p>
            Choose your projects, describe what you need, and review the
            proposed changes before confirming a code-generation job.
          </p>
          <Link className="button button-dark" to="/gemini">
            Open Gemini chat <span aria-hidden="true">↗</span>
          </Link>
          <p className="example-note">
            Illustrative conversation. Live Gemini processing requires the
            backend.
          </p>
        </div>
      </div>
    </section>
  );
}
