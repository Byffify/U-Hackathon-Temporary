export default function SiteFooter({ actions }) {
  return (
    <footer className="site-footer container">
      <a className="brand footer-brand" href="/">
        u-topia<span className="brand-dot">✳</span>
      </a>
      <span>Good work. New possibilities.</span>
      <div>
        <span className="preview-label">Interface preview · Fuji testnet</span>
        <button
          className="footer-link"
          type="button"
          onClick={() => actions.openPrivacy()}
        >
          About this preview
        </button>
      </div>
    </footer>
  );
}
