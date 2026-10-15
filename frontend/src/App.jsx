import { useEffect, useState } from "react";
import {
  createBrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { AppProvider, useApp } from "./app/AppContext.jsx";
import { ErrorState, Notice } from "./app/ui.jsx";
import CreatorLanding from "./pages/CreatorLanding.jsx";
import Modal from "./components/ui/Modal.jsx";
import {
  FeesDialog,
  AboutDialog,
} from "./components/dialogs/CreatorDialogs.jsx";
import {
  ExplorePage,
  ProjectDetailPage,
  CreatorProfilePage,
  NotFoundPage,
} from "./pages/Discovery.jsx";
import {
  ConnectPage,
  ProfileSettingsPage,
  WorkspacePage,
  ProjectEditorPage,
  ReleasePage,
  CheckoutPage,
  LibraryPage,
  EntitlementPage,
  ResalePage,
} from "./pages/commerce/index.jsx";
import { GeminiHome, GeminiChat } from "./pages/gemini/index.jsx";
import "./styles/app.css";
function Brand() {
  return (
    <Link className="brand" to="/" aria-label="U-topia home">
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <path
          d="M6 6v13a12 12 0 0 0 24 0V6h-7v13a5 5 0 0 1-10 0V6Z"
          fill="currentColor"
        />
      </svg>
      <span>
        u-topia<span className="brand-dot">✳</span>
      </span>
    </Link>
  );
}
function Header({ showNavigation = true }) {
  const { user, service, refreshSession } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  return (
    <>
      <header className="app-header">
        <Brand />
        {showNavigation && (
          <nav aria-label="Main navigation">
            <NavLink to="/explore">Explore</NavLink>
            <NavLink to="/workspace/projects">My workspace</NavLink>
          </nav>
        )}
        <div className="app-header-account">
          {user ? (
            <>
              <Link className="app-account" to="/settings/profile">
                {user.name}
              </Link>
              <button
                className="app-signout"
                onClick={async () => {
                  try {
                    await service.call("auth.logout");
                    await refreshSession();
                    navigate("/");
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link className="app-button" to="/connect">
              Connect wallet
            </Link>
          )}
        </div>
      </header>
      {error && <Notice tone="error">{error.message}</Notice>}
    </>
  );
}
function ModeBanner() {
  const { mode } = useApp();
  return (
    <div className={`app-mode-banner ${mode === "demo" ? "demo" : ""}`}>
      {mode === "demo"
        ? "Demo mode · Sample projects and simulated activity. No real purchases or Gemini generation."
        : "API mode · Fuji testnet · test AVAX only"}
    </div>
  );
}
function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${pathname === "/" ? "Websites worth building on" : pathname.split("/").filter(Boolean)[0]} · U-topia`;
    const focusMain = () => {
      const main = document.querySelector("main");
      if (!main?.querySelector("h1")) return false;
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      return true;
    };
    const observer = new MutationObserver(() => {
      if (focusMain()) observer.disconnect();
    });
    const frame = requestAnimationFrame(() => {
      if (!focusMain())
        observer.observe(document.body, { childList: true, subtree: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);
  return null;
}
function Root() {
  const { pathname } = useLocation();
  return (
    <AppProvider>
      {pathname !== "/" && (
        <a href="#app-main" className="skip-link">
          Skip to content
        </a>
      )}
      <RouteFocus />
      <ModeBanner />
      <Outlet />
    </AppProvider>
  );
}
function PublicShell() {
  return (
    <>
      <Header />
      <main id="app-main" tabIndex={-1} className="app-public">
        <Outlet />
      </main>
      <footer className="app-footer">
        <Brand />
        <span>Good work. New possibilities.</span>
        <Link to="/workspace/projects/new">Share your work</Link>
      </footer>
    </>
  );
}
function Guard() {
  const { user, sessionLoading, sessionError, sessionExpired, refreshSession } =
    useApp();
  const location = useLocation();
  if (sessionLoading)
    return (
      <main id="app-main" className="app-public">
        <p role="status">Checking your session…</p>
      </main>
    );
  if (sessionError)
    return (
      <main id="app-main" className="app-public">
        <ErrorState error={sessionError} retry={refreshSession} />
      </main>
    );
  return user ? (
    <>
      <Outlet />
      <Modal
        open={sessionExpired}
        label="Sign in again"
        contentKey="reauth"
        onClose={() => {}}
      >
        <h2>Sign in again to keep working</h2>
        <p>
          Your changes are still here. Reconnect the same account, then retry
          the action.
        </p>
        {sessionExpired && <ConnectPage />}
      </Modal>
    </>
  ) : (
    <Navigate
      replace
      to={`/connect?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
    />
  );
}
function WorkspaceShell() {
  const { user } = useApp();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  const nav = (
    <>
      <p className="app-sidebar-label">YOUR WORKSPACE</p>
      <NavLink to="/library">My library</NavLink>
      <NavLink to="/workspace/projects">My projects</NavLink>
      <NavLink to="/gemini">AI</NavLink>
      <NavLink to="/settings/profile">Profile settings</NavLink>
      <NavLink className="app-sidebar-explore" to="/explore">
        Explore
      </NavLink>
      <div className="app-sidebar-note">
        <span className="app-sidebar-mark" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          </svg>
        </span>
        <span className="app-sidebar-user-name">{user?.name}</span>
      </div>
    </>
  );
  return (
    <>
      <Header showNavigation={false} />
      <div className="app-workspace">
        <aside className="app-sidebar" aria-label="Workspace navigation">
          {nav}
        </aside>
        <button
          className="app-mobile-menu app-button secondary"
          onClick={() => setMenu(true)}
        >
          Open workspace menu
        </button>
        <Modal
          open={menu}
          label="Workspace navigation"
          contentKey="workspace-navigation"
          onClose={() => setMenu(false)}
        >
          <h2>Workspace</h2>
          <nav
            className="app-drawer-nav"
            aria-label="Mobile workspace navigation"
          >
            {nav}
          </nav>
        </Modal>
        <main id="app-main" tabIndex={-1} className="app-workspace-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
function LandingRoute() {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);
  const actions = {
    openStart: () => navigate("/workspace/projects/new"),
    openExplore: () => navigate("/explore"),
    openProject: (id) => navigate(`/projects/${id}`),
    openFees: () => setDialog("fees"),
    previewPlan: () => navigate("/gemini"),
    openPrivacy: () => setDialog("about"),
  };
  return (
    <>
      <CreatorLanding actions={actions} />
      <Modal
        open={Boolean(dialog)}
        contentKey={dialog || ""}
        onClose={() => setDialog(null)}
      >
        {dialog === "fees" ? (
          <FeesDialog onStart={actions.openStart} />
        ) : dialog === "about" ? (
          <AboutDialog />
        ) : null}
      </Modal>
    </>
  );
}
function RouteFailure() {
  const error = useRouteError();
  return (
    <main className="app-public">
      <Notice tone="error">
        {error?.message || "This page could not be opened."}
      </Notice>
      <a className="app-button" href="/">
        Return home
      </a>
    </main>
  );
}
export const routes = [
  {
    element: <Root />,
    errorElement: <RouteFailure />,
    children: [
      { path: "/", element: <LandingRoute /> },
      {
        element: <PublicShell />,
        children: [
          { path: "/explore", element: <ExplorePage /> },
          { path: "/projects/:projectId", element: <ProjectDetailPage /> },
          { path: "/creators/:creatorId", element: <CreatorProfilePage /> },
          { path: "/connect", element: <ConnectPage /> },
          { path: "/resales/:offerId", element: <ResalePage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      {
        element: <Guard />,
        children: [
          {
            element: <PublicShell />,
            children: [
              { path: "/checkout/:projectId", element: <CheckoutPage /> },
            ],
          },
          {
            element: <WorkspaceShell />,
            children: [
              { path: "/library", element: <LibraryPage /> },
              { path: "/library/:entitlementId", element: <EntitlementPage /> },
              { path: "/settings/profile", element: <ProfileSettingsPage /> },
              { path: "/workspace/projects", element: <WorkspacePage /> },
              {
                path: "/workspace/projects/new",
                element: <ProjectEditorPage />,
              },
              {
                path: "/workspace/projects/:projectId/edit",
                element: <ProjectEditorPage />,
              },
              {
                path: "/workspace/projects/:projectId/releases/new",
                element: <ReleasePage />,
              },
              { path: "/gemini", element: <GeminiHome /> },
              { path: "/gemini/chats/:chatId", element: <GeminiChat /> },
            ],
          },
        ],
      },
    ],
  },
];
const router = createBrowserRouter(routes);
export default function App() {
  return <RouterProvider router={router} />;
}
