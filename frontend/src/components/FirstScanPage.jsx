// FirstScanPage.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "../LanguageContext";

const API = process.env.REACT_APP_API_BASE_URL;

export default function FirstScanPage({ tagId, onProceed }) {
  const { t } = useTranslation();
  const s = t.firstScan;

  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res  = await fetch(`${API}/tag-code/${tagId}`);
        const json = await res.json();

        if (res.ok) {
          setCode(json.code);
        } else if (res.status === 409) {
          // Tag was claimed between routing and this fetch — proceed directly
          onProceed();
          return;
        } else if (res.status === 403) {
          setError("TAG_INACTIVE");
        } else if (res.status === 404) {
          setError(json.error === "CODE_NOT_AVAILABLE" ? "CODE_NOT_AVAILABLE" : "TAG_NOT_FOUND");
        } else {
          setError(json.error || "FETCH_FAILED");
        }
      } catch {
        setError("FETCH_FAILED");
      } finally {
        setLoading(false);
      }
    };

    fetchCode();
  }, [tagId, onProceed]);

  const copyCode = async () => {
    if (!code) return;

    // Modern clipboard API — works on mobile when served over HTTPS
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fall through to execCommand fallback
      }
    }

    // Fallback: create an off-screen textarea, select its content, and copy
    const ta = document.createElement("textarea");
    ta.value = code;
    ta.setAttribute("readonly", "");
    // Position off-screen but visible enough for iOS to allow selection
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px;";
    document.body.appendChild(ta);

    // iOS requires a specific selection approach
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ta.setSelectionRange(0, 999999);
    } else {
      ta.select();
    }

    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Both methods failed — silently ignore
    } finally {
      document.body.removeChild(ta);
    }
  };

  // Still redirecting — render nothing
  if (!loading && !error && !code) return null;

  return (
    <div className="page first-scan-page animate-fade-in">

      {/* Header */}
      <header className="hero-section">
        <div className="nfc-icon-wrapper">
          <span className="nfc-animation-ring" />
        </div>
        <h1>
          {s.welcomePrefix} <strong className="brand">{t.common.brand}</strong>
        </h1>
        <p className="subtitle">{s.subtitle}</p>
      </header>

      {/* Tag info + code */}
      <section className="info-card">
        <p className="tag-id-display">
          {s.tagDetected} <strong>{tagId.toUpperCase()}</strong>
        </p>

        <div className="verification-container">
          <p className="fsp-code-label">{s.keepCode}</p>
          <p className="note-paragraph">{s.keepCodeNote}</p>

          {/* Loading skeleton */}
          {loading && (
            <div className="fsp-code-box loading">
              <span className="fsp-code-skeleton" />
            </div>
          )}

          {/* Code available */}
          {!loading && code && (
            <div className="fsp-code-box">
              <span id="fsp-code-text" className="fsp-code-value">{code}</span>
              <button className="fsp-copy-btn" onClick={copyCode}>
                {copied ? s.copied || "✓ Copied" : s.copy || "Copy"}
              </button>
            </div>
          )}

          {/* Code unavailable — tag valid but no code stored */}
          {!loading && error === "CODE_NOT_AVAILABLE" && (
            <div className="fsp-code-box fsp-code-unavailable">
              <span>{s.codeUnavailable || "Code unavailable — contact support."}</span>
            </div>
          )}

          {/* Tag inactive */}
          {!loading && error === "TAG_INACTIVE" && (
            <div className="fsp-code-box fsp-code-unavailable">
              <span>{s.tagInactive || "This tag has been deactivated."}</span>
            </div>
          )}

          {/* Tag not found */}
          {!loading && error === "TAG_NOT_FOUND" && (
            <div className="fsp-code-box fsp-code-unavailable">
              <span>{s.tagNotFound || "Tag not found — contact support."}</span>
            </div>
          )}

          {/* Network / unknown error */}
          {!loading && error === "FETCH_FAILED" && (
            <div className="fsp-code-box fsp-code-unavailable">
              <span>{s.fetchFailed || "Could not load code — check your connection."}</span>
            </div>
          )}
        </div>
      </section>

      {/* CTA — blocked for hard errors (inactive / not found) */}
      {!loading && error !== "TAG_INACTIVE" && error !== "TAG_NOT_FOUND" && (
        <footer className="action-footer">
          <button className="btn primary-btn large-btn" onClick={onProceed}>
            {s.claimTag}
          </button>
        </footer>
      )}

    </div>
  );
}