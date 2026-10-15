import { useEffect, useRef, useState } from "react";
import { projects } from "../../data/creatorExamples.js";
import { ProjectArt, ProjectCard } from "../landing/ProjectArt.jsx";
import { splitSale, formatAvax } from "../../utils/pricing.js";
import { connectBrowserWallet, walletErrorMessage } from "../../lib/wallet.js";

const Arrow = () => <span aria-hidden="true">↗</span>;

export function StartDialog() {
  const [wallet, setWallet] = useState({
    status: "idle",
    address: "",
    error: "",
  });
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function connect() {
    setWallet({ status: "busy", address: "", error: "" });
    try {
      const address = await connectBrowserWallet();
      if (active.current)
        setWallet({ status: "connected", address, error: "" });
    } catch (error) {
      if (active.current)
        setWallet({
          status: "error",
          address: "",
          error: walletErrorMessage(error),
        });
    }
  }
  const items = [
    [
      "A working demo",
      "Use the URL from wherever you already host your website.",
    ],
    [
      "Your source, as a ZIP",
      "The full project, with setup instructions and no private keys or secrets.",
    ],
    [
      "Your price and permissions",
      "Set a test AVAX price and decide how buyers can use and build on your work.",
    ],
    [
      "Your wallet",
      "Your profile and purchased rights use your wallet identity.",
    ],
  ];
  return (
    <>
      <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
      <h2 id="dialog-title">
        Good work.
        <br />
        Ready to be shared.
      </h2>
      <p className="dialog-intro">Get your first project ready. You’ll need:</p>
      <ol className="creator-checklist">
        {items.map(([title, copy], i) => (
          <li key={title}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>{title}</strong>
              <p>{copy}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="preview-callout">
        <strong>You’re exploring the interface preview.</strong>
        <p>
          Publishing, account authentication, and purchases aren’t connected
          yet. Connecting below only requests your wallet address.
        </p>
      </div>
      <div className="wallet-status" role="status">
        {wallet.error && <p className="field-error">{wallet.error}</p>}
        {wallet.address && (
          <>
            <code>
              {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
            </code>
            <p className="wallet-connected">Wallet connected.</p>
            <p className="small-text">
              Address access only. No signature or payment was requested.
              Publishing is not connected in this preview.
            </p>
          </>
        )}
      </div>
      <button
        className="button button-dark full-width"
        type="button"
        onClick={connect}
        disabled={wallet.status === "busy" || wallet.status === "connected"}
        aria-busy={wallet.status === "busy"}
      >
        {wallet.status === "busy"
          ? "Waiting for wallet…"
          : wallet.status === "connected"
            ? "Wallet connected"
            : "Connect wallet"}{" "}
        <Arrow />
      </button>
    </>
  );
}

export function FeesDialog({ onStart }) {
  const [price, setPrice] = useState("1");
  const result = splitSale(price);
  return (
    <>
      <p className="eyebrow">ONE SIMPLE SPLIT</p>
      <h2 id="dialog-title">You keep 90%.</h2>
      <p className="dialog-intro">
        U-topia takes 10% of the sale price and covers purchase gas from that
        share. There are no upstream royalties on derivative sales.
      </p>
      <div className="fee-calculator">
        <label htmlFor="sale-price">
          Example sale price <span>test AVAX</span>
        </label>
        <input
          id="sale-price"
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <output id="calc-total" htmlFor="sale-price">
          {formatAvax(result.total)} test AVAX
        </output>
        <div className="calculator-row">
          <span>You receive</span>
          <strong>{formatAvax(result.seller)} test AVAX</strong>
        </div>
        <div className="calculator-row">
          <span>Platform share</span>
          <strong>{formatAvax(result.platform)} test AVAX</strong>
        </div>
      </div>
      <div className="preview-callout">
        <strong>Purchase gas is included in the platform’s share.</strong>
        <p>
          Network costs reduce the platform’s proceeds, not the seller’s 90%.
          Other actions aren’t included in this purchase-gas promise.
        </p>
      </div>
      <p className="small-text">
        Illustrative calculation in test AVAX. No transaction is submitted and
        this is not a live gas estimate.
      </p>
      <button
        className="button button-dark full-width"
        type="button"
        onClick={onStart}
      >
        Start creating <Arrow />
      </button>
    </>
  );
}

export function ExploreDialog({ onProject }) {
  const [query, setQuery] = useState("");
  const input = useRef();
  const found = projects.filter((p) =>
    `${p.title} ${p.stack} ${p.type} ${p.description}`
      .toLocaleLowerCase("en")
      .includes(query.trim().toLocaleLowerCase("en")),
  );
  return (
    <>
      <p className="eyebrow">A FEW POSSIBLE STARTING POINTS</p>
      <h2 id="dialog-title">Find your next idea.</h2>
      <p className="dialog-intro">
        Illustrative projects for this interface preview. No purchases are made
        here.
      </p>
      <div className="search-field">
        <label className="sr-only" htmlFor="project-search">
          Search example projects
        </label>
        <span aria-hidden="true">⌕</span>
        <input
          id="project-search"
          ref={input}
          type="search"
          placeholder="Search projects or stacks"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear project search"
            onClick={() => {
              setQuery("");
              input.current.focus();
            }}
          >
            ×
          </button>
        )}
      </div>
      <div className="explore-results">
        {found.length ? (
          found.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onProject={onProject}
            />
          ))
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>No matching projects.</h3>
            <p>Try “dashboard” or a stack like “React”.</p>
          </div>
        )}
      </div>
      <p className="small-text" role="status">
        {found.length} example {found.length === 1 ? "project" : "projects"}
      </p>
    </>
  );
}

export function ProjectDialog({ id, onExplore }) {
  const project = projects.find((p) => p.id === id);
  return (
    <>
      <p className="eyebrow">ILLUSTRATIVE PROJECT</p>
      <h2 id="dialog-title">{project.title}</h2>
      <p className="dialog-intro">
        By {project.creator} · {project.stack}
      </p>
      <div className="project-dialog-art">
        <ProjectArt id={id} />
      </div>
      <p>{project.description}</p>
      <div className="stack-tags">
        {project.features.map((feature) => (
          <span className="tag" key={feature}>
            {feature}
          </span>
        ))}
      </div>
      <div className="project-offer">
        <div>
          <span className="small-label">EXAMPLE PRICE</span>
          <strong>
            {project.price} <small>test AVAX</small>
          </strong>
        </div>
        <span className="tag">Source ZIP + listing updates</span>
      </div>
      <div className="preview-callout">
        <strong>A project preview, not a live offer.</strong>
        <p>
          Real listings will include the creator’s license and demo URL.
          Purchasing and source downloads aren’t connected here.
        </p>
      </div>
      <button
        className="button button-dark full-width"
        type="button"
        onClick={onExplore}
      >
        Back to example projects <Arrow />
      </button>
    </>
  );
}

export function PlanDialog({ plan, onClose }) {
  return (
    <>
      <p className="eyebrow">YOUR COMBINATION, BEFORE YOU COMMIT</p>
      <h2 id="dialog-title">Here’s the idea.</h2>
      <p className="dialog-intro">
        An interactive plan example. No model has run and no quota has been
        used.
      </p>
      <div className="plan-stack">
        <span className="small-label">TARGET STACK</span>
        <strong>{plan.stack}</strong>
      </div>
      <div className="plan-features">
        {plan.sources.map((source) => (
          <div key={source.id}>
            <span className="tag">{source.title}</span>
            <ul>
              {source.selectedFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {plan.extra && (
        <div className="plan-extra">
          <span className="small-label">YOUR ADDITIONS</span>
          <p>{plan.extra}</p>
        </div>
      )}
      <div className="preview-callout">
        <strong>Quota is checked before code generation.</strong>
        <p>
          In the connected service, U-Bot will analyze compatibility and
          estimate quota. You can change features before confirming. This
          preview has no AI integration or quota estimate.
        </p>
      </div>
      <button className="button button-dark full-width" type="button" disabled>
        Code generation is not connected
      </button>
      <button className="text-button" type="button" onClick={onClose}>
        Keep editing the plan <Arrow />
      </button>
    </>
  );
}

export function AboutDialog() {
  return (
    <>
      <p className="eyebrow">ABOUT THIS PREVIEW</p>
      <h2 id="dialog-title">A first look at U-topia.</h2>
      <p>
        This React frontend adapts the supplied creator-landing UX reference to
        U-topia’s product rules. Creator names and projects are illustrative.
      </p>
      <h3>What works here</h3>
      <p>
        Creator and profile tabs, project search, fee calculations, feature
        selection, plan previews, and optional browser-wallet connection.
      </p>
      <h3>What isn’t connected yet</h3>
      <p>
        Backend authentication, IPFS publication, purchase contracts, sponsored
        settlement, and AI generation. Connecting a wallet only requests an
        address; this page does not request a signature or payment.
      </p>
      <h3>Data in this page</h3>
      <p>
        Selections stay in this page. Creator/tab choices appear in the URL.
        Interaction events stay in the browser; no analytics service receives
        them. Fonts are requested from Google Fonts. No source ZIP or API key is
        requested or stored.
      </p>
    </>
  );
}
