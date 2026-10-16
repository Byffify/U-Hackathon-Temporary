import { NETWORK_NAME, NATIVE_TOKEN_SYMBOL } from "../../lib/network.js";

export default function FeeSection() {
  return (
    <section
      className="section container fee-section"
      id="fees"
      aria-labelledby="fee-title"
    >
      <div className="fee-panel">
        <div className="fee-copy">
          <p className="eyebrow">A LITTLE FOR US. MOSTLY FOR YOU.</p>
          <h2 id="fee-title">
            Your work.
            <br />
            Your <span className="fee-highlight">90%.</span>
          </h2>
          <p>
            One simple fee on every sale.
            <br />
            No puzzle. No upstream royalties.
          </p>
        </div>
        <div className="fee-visual">
          <div className="earnings-card">
            <div className="earnings-card-top">
              <span className="small-label">AN EXAMPLE SALE</span>
              <span className="tag">{NATIVE_TOKEN_SYMBOL}</span>
            </div>
            <p className="sale-amount">
              1.00 <span>{NATIVE_TOKEN_SYMBOL}</span>
            </p>
            <div
              className="split-bar"
              aria-label="90 percent to you, 10 percent platform fee"
            >
              <span></span>
              <span></span>
            </div>
            <div className="earning-line">
              <span>
                <i className="legend-dot dot-lime"></i>You keep
              </span>
              <strong>0.90</strong>
            </div>
            <div className="earning-line muted-line">
              <span>
                <i className="legend-dot dot-ink"></i>Platform fee
              </span>
              <strong>0.10</strong>
            </div>
            <div className="gas-note">
              <span aria-hidden="true">✓</span> Purchase gas comes from our 10%.
            </div>
          </div>
          <span className="fee-sticker" aria-hidden="true">
            more room
            <br />
            to create <span>✳</span>
          </span>
        </div>
      </div>
      <p className="fee-caption">
        Illustrative calculation. {NETWORK_NAME} uses {NATIVE_TOKEN_SYMBOL}. Platform costs,
        including purchase gas, are paid from the platform share.
      </p>
    </section>
  );
}
