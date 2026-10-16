import { ProfileArtwork } from "./ProjectArt.jsx";
export default function FeatureShowcase() {
  return (
    <section
      className="section container features-section"
      aria-label="What you can do with KEEPHUB"
    >
      <article className="feature-row">
        <ProfileArtwork />
        <div className="feature-copy">
          <p className="eyebrow">MAKE YOUR WORK FINDABLE</p>
          <h2>
            A home for your
            <br />
            “I built that.”
          </h2>
          <p>
            One profile for your projects and the person behind them. A place to
            share from your résumé, your socials, or your next introduction.
          </p>
        </div>
      </article>
      <article className="feature-row feature-reverse">
        <div className="feature-art source-art">
          <div className="source-browser">
            <div className="browser-chrome">
              <i></i>
              <i></i>
              <i></i>
              <span>your-next-project.zip</span>
            </div>
            <div className="source-file">
              <div className="zip-icon" aria-hidden="true">
                {"{"}
                <span>ZIP</span>
                {"}"}
              </div>
              <span className="tag tag-light">YOUR SOURCE</span>
              <h3>
                Share the demo.
                <br />
                Protect the project.
              </h3>
              <div className="file-status">
                <span aria-hidden="true">◈</span> Encrypted on IPFS
              </div>
              <div className="file-status">
                <span aria-hidden="true">◇</span> Access tied to purchased
                rights
              </div>
              <div className="file-status">
                <span aria-hidden="true">↻</span> Updates included
              </div>
            </div>
          </div>
          <span className="floating-label source-label">
            A new start, on your terms.
          </span>
        </div>
        <div className="feature-copy">
          <p className="eyebrow">SHOW THE VALUE. KEEP THE SOURCE.</p>
          <h2>
            A demo to try.
            <br />
            Source to build on.
          </h2>
          <p>
            Let visitors explore your existing demo. The complete source will be
            delivered separately, with your license terms and access checked
            against the buyer’s token.
          </p>
          <p className="feature-disclosure">
            Browser-delivered frontend code can still be inspected. Full source
            access is a separate purchase.
          </p>
          <p className="feature-disclosure">
            Planned source delivery · IPFS uploads and token checks are not
            connected in this interface preview.
          </p>
        </div>
      </article>
    </section>
  );
}
