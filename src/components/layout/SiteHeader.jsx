export default function SiteHeader({ actions }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="U-topia home">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <path
              d="M6 6v13a12 12 0 0 0 24 0V6h-7v13a5 5 0 0 1-10 0V6Z"
              fill="currentColor"
            />
            <path d="M17 5h3v9h-3z" fill="currentColor" />
          </svg>
          <span>
            u-topia<span className="brand-dot">✳</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#creators">Explore</a>
          <a className="nav-active" href="#main" aria-current="page">
            For creators
          </a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="header-actions">
          <span className="network-label">
            <span className="network-dot"></span>Fuji testnet
          </span>
          <button
            className="button button-dark button-small"
            type="button"
            onClick={() => actions.openStart("header")}
          >
            Start creating <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </header>
  );
}
