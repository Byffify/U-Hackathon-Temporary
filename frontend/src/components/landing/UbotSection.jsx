import UbotPreview from "./UbotPreview.jsx";
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
            <span aria-hidden="true">✳</span> MEET U-BOT
          </p>
          <h2 id="ubot-title">
            A little of this.
            <br />A little of that.
            <br />
            <span>Something yours.</span>
          </h2>
          <p>
            Pick features from projects you can use. Choose your stack. Review
            the plan. Bring a new idea together.
          </p>
          <p className="small-text">
            U-Bot is for combining projects. Trial quota is per account; no
            daily reset or top-ups.
          </p>
        </div>
        <UbotPreview onPlan={actions.previewPlan} />
      </div>
    </section>
  );
}
