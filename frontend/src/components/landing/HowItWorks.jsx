export default function HowItWorks() {
  return (
    <section
      className="section container process-section"
      id="how-it-works"
      aria-labelledby="process-title"
    >
      <div className="center-heading">
        <p className="eyebrow">FROM “I MADE THIS” TO “IT’S YOURS”</p>
        <h2 id="process-title">
          A small step.
          <br />A whole new possibility.
        </h2>
      </div>
      <div className="process-grid">
        <article>
          <span className="process-number">01</span>
          <h3>Show what it does.</h3>
          <p>
            Add your demo, a few good images, and the story behind your project.
          </p>
        </article>
        <article>
          <span className="process-number">02</span>
          <h3>Sell what you made.</h3>
          <p>
            Upload your source ZIP. Set your price and the rights you’re happy
            to share.
          </p>
        </article>
        <article>
          <span className="process-number">03</span>
          <h3>Let it become more.</h3>
          <p>
            Buyers get the code. With your permission, new ideas can grow from
            it.
          </p>
        </article>
      </div>
    </section>
  );
}
