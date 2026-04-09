// App.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { supabase } from "./supabase";
import { LanguageProvider, useTranslation } from "../LanguageContext";
import LanguageSwitcher from "../LanguageSwitcher";
import Home from "./Home";
import FirstScanPage from "./FirstScanPage";
import RegisterPage from "./RegisterPage";
import AdminLoginPage from "./AdminLoginPage";
import SetupPage from "./SetupPage";
import PublicPage from "./PublicPage";
import AdminPanel from "./AdminPanel";
import ResetPassword from "./ResetPassword";
import "../style/App.css";

const VIEWS = {
  LOADING:     "loading",
  ERROR:       "error",
  DEACTIVATED: "deactivated",
  HOME:        "home",
  FIRST_SCAN:  "first-scan",
  REGISTER:    "register",
  LOGIN:       "login",
  SETUP:       "setup",
  PUBLIC:      "public",
};

const NO_FLOAT_SWITCHER = new Set([VIEWS.HOME, VIEWS.PUBLIC, VIEWS.LOADING]);

// Derive once — stable for the lifetime of the page
const pathParts           = window.location.pathname.split("/").filter(Boolean);
const isAdminPath         = window.location.pathname === "/admin";
const isResetPasswordPath = window.location.pathname === "/reset-password";
const tagId               = !isAdminPath && !isResetPasswordPath ? (pathParts[0] || null) : null;

// ── Pure routing function ─────────────────────────────────────
function resolveView(tagData, currentUser) {
  if (!tagData) return VIEWS.LOADING;

  const { status, ownerId, isSetup } = tagData;

  if (status === "deactivated") return VIEWS.DEACTIVATED;
  if (!ownerId && !isSetup)     return VIEWS.FIRST_SCAN;
  if (ownerId && !isSetup)      return currentUser?.id === ownerId ? VIEWS.SETUP : VIEWS.REGISTER;
  if (isSetup)                  return VIEWS.PUBLIC;

  return VIEWS.LOADING;
}

function AppInner() {
  const { t } = useTranslation();
  const s = t.app;

  // ── ALL hooks before any conditional return ───────────────────
  const [view,       setView]       = useState(VIEWS.LOADING);
  const [tagData,    setTagData]    = useState(null);
  const [user,       setUser]       = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // routedOnce: after the initial auto-route fires, manual navigation
  // (e.g. clicking "Claim My Tag") must not be overridden by the effect.
  const routedOnce = useRef(false);

  const userRef    = useRef(null);
  const tagDataRef = useRef(null);

  const setUserSync = useCallback((u) => {
    userRef.current = u;
    setUser(u);
  }, []);

  const setTagDataSync = useCallback((d) => {
    tagDataRef.current = d;
    setTagData(d);
  }, []);

  // ── Fetch tag ─────────────────────────────────────────────────
  const fetchTag = useCallback(async () => {
    if (!tagId || isResetPasswordPath || isAdminPath) return null;
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/tag/${tagId}`
      );
      setTagDataSync(res.data);
      return res.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        setView(VIEWS.ERROR);
      } else {
        console.warn("Tag fetch failed, retrying once…", err?.message);
        setTimeout(async () => {
          try {
            const res = await axios.get(
              `${process.env.REACT_APP_API_BASE_URL}/tag/${tagId}`
            );
            setTagDataSync(res.data);
          } catch {
            setView(VIEWS.ERROR);
          }
        }, 3000);
      }
      return null;
    }
  }, [setTagDataSync]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── After any auth action: refresh session + tag, then route ──
  const refreshThenFetch = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const freshUser = session?.user ?? null;
    setUserSync(freshUser);

    const freshTag = await fetchTag();
    if (freshTag) {
      // Reset routedOnce so the new resolved view takes effect
      routedOnce.current = false;
      setView(resolveView(freshTag, freshUser));
      routedOnce.current = true;
    }
  }, [fetchTag, setUserSync]);

  // ── Auth listener ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setUserSync(session?.user ?? null);

        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN"       ||
          event === "SIGNED_OUT"      ||
          event === "TOKEN_REFRESHED"
        ) {
          setAuthLoaded(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUserSync]);

  // ── Initial tag fetch ─────────────────────────────────────────
  useEffect(() => { fetchTag(); }, [fetchTag]);

  // ── Routing effect — fires ONCE on initial load only ─────────
  // After routedOnce is true, all navigation is manual (setView calls)
  // or goes through refreshThenFetch. The effect never overrides those.
  useEffect(() => {
    if (isAdminPath || isResetPasswordPath) return;
    if (!tagId) { setView(VIEWS.HOME); routedOnce.current = true; return; }
    if (routedOnce.current) return;
    if (view === VIEWS.ERROR) { routedOnce.current = true; return; }
    if (!authLoaded || !tagData) return;

    setView(resolveView(tagData, userRef.current));
    routedOnce.current = true;
  }, [authLoaded, tagData, user, view]);

  // ── Early returns (MUST come after all hooks) ─────────────────
  if (isResetPasswordPath) return <ResetPassword />;
  if (isAdminPath)         return <AdminPanel />;

  const showFloat = !NO_FLOAT_SWITCHER.has(view);

  const floatBtn = showFloat && (
    <div className="float-lang-btn">
      <LanguageSwitcher />
    </div>
  );

  if (view === VIEWS.LOADING) return (
    <div className="app-shell">
      {floatBtn}
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ margin: 0 }}>{s.initializing}</p>
      </div>
    </div>
  );

  if (view === VIEWS.ERROR) return (
    <div className="app-shell">
      {floatBtn}
      <div className="error-screen">
        <h1 style={{ fontSize: "6rem", textAlign: "center" }}>404</h1>
        <p   style={{ fontSize: "1.4rem", textAlign: "center" }}>{s.notFound}</p>
      </div>
    </div>
  );

  if (view === VIEWS.DEACTIVATED) return (
    <div className="app-shell">
      {floatBtn}
      <div className="error-screen">
        <h1 style={{ fontSize: "3.5rem", textAlign: "center" }}>⚠️</h1>
        <p   style={{ fontSize: "1.4rem", textAlign: "center", fontWeight: 700 }}>
          {s.tagInactive}
        </p>
        <p   style={{ fontSize: "0.95rem", textAlign: "center", color: "#64748b" }}>
          {s.tagInactiveHelp}
        </p>
      </div>
    </div>
  );

  if (view === VIEWS.HOME) return <Home />;

  return (
    <div className="app-shell">
      {floatBtn}
      <div className="app-container">

        {view === VIEWS.FIRST_SCAN && (
          <FirstScanPage
            tagId={tagId}
            onProceed={() => setView(VIEWS.REGISTER)}
          />
        )}

        {view === VIEWS.REGISTER && (
          <RegisterPage
            tagId={tagId}
            onAdminCreated={() => refreshThenFetch()}
          />
        )}

        {view === VIEWS.LOGIN && (
          <AdminLoginPage
            onLoginSuccess={() => refreshThenFetch()}
            onBack={() => setView(VIEWS.PUBLIC)}
          />
        )}

        {view === VIEWS.SETUP && (
          <SetupPage
            tagId={tagId}
            onSave={() => refreshThenFetch()}
            onLogout={() => refreshThenFetch()}
          />
        )}

        {view === VIEWS.PUBLIC && (
          <PublicPage
            tagId={tagId}
            onBack={() => {(authLoaded && user) ? setView(VIEWS.SETUP) : setView(VIEWS.LOGIN)}}
            handleRetry={() => refreshThenFetch()}
          />
        )}

      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider defaultLang="en">
      <AppInner />
    </LanguageProvider>
  );
}