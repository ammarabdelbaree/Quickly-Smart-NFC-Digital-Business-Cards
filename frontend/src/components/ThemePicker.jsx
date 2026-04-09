import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaFacebook, FaInstagram, FaLinkedin, FaWhatsapp,
  FaTelegram, FaLink, FaPhoneAlt,
} from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";
import { THEMES, getTheme } from "../themes";
import { useTranslation } from "../LanguageContext";
 
// ── Tiny phone preview — mirrors PublicPage structure ─────────
function PhonePreview({ theme, pageData, profilePicFile, coverPhotoFile }) {
  const vars  = theme.vars;
  const name  = pageData?.name  || "Your Name";
  const title = pageData?.title || "Your Title";
 
  const profileSrc = profilePicFile instanceof File
    ? URL.createObjectURL(profilePicFile)
    : typeof profilePicFile === "string" ? profilePicFile : null;
 
  const coverSrc = coverPhotoFile instanceof File
    ? URL.createObjectURL(coverPhotoFile)
    : typeof coverPhotoFile === "string" ? coverPhotoFile : null;
 
  const sampleLinks = [
    { platform: "instagram", label: "Instagram" },
    { platform: "linkedin",  label: "LinkedIn"  },
    { platform: "whatsapp",  label: "WhatsApp"  },
  ];
 
  const iconFor = (p) => {
    const s = { width: 9, height: 9 };
    switch (p) {
      case "instagram": return <FaInstagram style={s} />;
      case "linkedin":  return <FaLinkedin  style={s} />;
      case "whatsapp":  return <FaWhatsapp  style={s} />;
      case "facebook":  return <FaFacebook  style={s} />;
      case "telegram":  return <FaTelegram  style={s} />;
      default:          return <FaLink      style={s} />;
    }
  };
 
    const getIconColor = useCallback((platform) => {
      const platformName = platform?.trim();
      const colorMap = {
        facebook:  "#1877F2",
        instagram: "#E1306C",
        linkedin:  "#0A66C2",
        whatsapp:  "#25D366",
        telegram:  "#29B6F6",
        snapchat:  "#FFFC00",
        twitter:   "#000000",
        threads:   "#000000",
        youtube:   "#FF0000",
        phone: "#25D366",
        instapay:  "transparent",
      };
      return colorMap[platformName] || "var(--link-icon-color, var(--primary))";
    }, []);
  const dividerColor = vars["--divider-color"] || "rgba(168,85,247,0.3)";
  const avatarBorder = vars["--avatar-border"] || vars["--primary"];
 
  return (
    <div className="tp-phone" style={{ background: vars["--bg-color"] }}>
      {/* Cover */}
      <div
        className="tp-cover"
        style={
          coverSrc
            ? { backgroundImage: `url(${coverSrc})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: vars["--cover-default"] }
        }
      />
 
      {/* Avatar */}
      <div className="tp-avatar-wrap">
        {profileSrc ? (
          <img
            src={profileSrc}
            alt=""
            className="tp-avatar-img"
            style={{ borderColor: avatarBorder }}
          />
        ) : (
          <div
            className="tp-avatar-placeholder"
            style={{ background: vars["--gradient"], borderColor: avatarBorder }}
          >
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
 
      {/* Card body */}
      <div className="tp-body" style={{ background: vars["--card-bg"] }}>
        {/* Name */}
        <div
          className="tp-name"
          style={{
            color: vars["--avatar-border"],
            filter: "brightness(1.2)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text"
          }}
        >
          {name}
        </div>
        <div className="tp-title" style={{ color: vars["--text-muted"] }}>{title}</div>
 
        {/* Save btn */}
        <div
          className="tp-save-btn"
          style={{
            background: vars["--glass-bg"],
            border: `1px solid ${vars["--border-soft"]}`,
            color: vars["--sub-text"],
          }}
        >
          Save Contact
        </div>
 
        {/* Contact items */}
        <div className="tp-contacts">
          {[
            { icon: <FaPhoneAlt style={{ width: 7, height: 7 }} />, label: "+1 234 567 890" },
            { icon: <HiOutlineMail style={{ width: 9, height: 9 }} />, label: "you@email.com" },
          ].map((c, i) => (
            <div
              key={i}
              className="tp-contact-item"
              style={{
                background: vars["--glass-bg"],
                border: `1px solid ${vars["--border-soft"]}`,
                color: vars["--sub-text"],
              }}
            >
              <div
                className="tp-icon-box"
                style={{
                  background: vars["--glass-bg"],
                  border: `1px solid ${vars["--border-soft"]}`,
                  color: getIconColor("phone"),
                }}
              >
                {c.icon}
              </div>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
 
        {/* Divider — uses theme divider color */}
        <div
          className="tp-divider"
          style={{
            background: `linear-gradient(90deg, transparent, ${dividerColor}, transparent)`,
          }}
        />
 
        {/* Links */}
        <div className="tp-links">
          {sampleLinks.map((lk, i) => (
            <div
              key={i}
              className="tp-link-card"
              style={{
                background: vars["--glass-bg"],
                border: `1px solid ${vars["--border-soft"]}`,
                color: vars["--sub-text"],
              }}
            >
              <div className="tp-link-icon" style={{ color: getIconColor(lk.platform) }}>
                {iconFor(lk.platform)}
              </div>
              <span className="tp-link-label">{lk.label}</span>
              <span className="tp-link-arrow" style={{ color: vars["--text-faint"] }}>→</span>
            </div>
          ))}
        </div>
 
        {/* Footer — PINNED branding, never affected by theme */}
        <div className="tp-footer" style={{ color: "rgba(138, 145, 168, 0.55)" }}>
          Powered by{" "}
          <strong
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Quickly
          </strong>
        </div>
      </div>
    </div>
  );
}
 
// ── Main ThemePicker ──────────────────────────────────────────
export default function ThemePicker({
  selectedTheme,
  onChange,
  pageData,
  profilePicFile,
  coverPhotoFile,
}) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState(null);
  const panelRef = useRef(null);
 
  const activeId     = selectedTheme || "default";
  const displayId    = hoveredTheme  || activeId;
  const displayTheme = getTheme(displayId);
 
  // Localised theme names/descs (fall back to the theme object's name)
  const themeLocale = t.themes || {};
 
  // Close preview on outside click
  useEffect(() => {
    if (!previewOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPreviewOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [previewOpen]);
 
  return (
    <div className="tp-section" ref={panelRef}>
      <div className="tp-header">
        <div className="tp-header-text">
          <h3 className="tp-title-label">
            {t.setup?.themeLabel || "Choose a Theme"}
          </h3>
          <p className="tp-subtitle">
            {t.setup?.themeSubtitle || "Pick a colour palette for your public profile."}
          </p>
        </div>
        <button
          type="button"
          className="tp-preview-btn"
          onClick={() => setPreviewOpen((o) => !o)}
        >
          {previewOpen
            ? (t.setup?.themeHidePreview || "Hide Preview")
            : (t.setup?.themeShowPreview || "Preview")}
        </button>
      </div>
 
      {/* ── Swatches ── */}
      <div className="tp-swatches">
        {THEMES.map((theme) => {
          const isActive = theme.id === activeId;
          const locName  = themeLocale[theme.id]?.name || theme.name;
          const locDesc  = themeLocale[theme.id]?.desc;
 
          return (
            <button
              key={theme.id}
              type="button"
              className={`tp-swatch${isActive ? " tp-swatch--active" : ""}`}
              onClick={() => onChange(theme.id)}
              onMouseEnter={() => setHoveredTheme(theme.id)}
              onMouseLeave={() => setHoveredTheme(null)}
              title={locDesc || locName}
            >
              {/* Colour dots — 2×2 grid */}
              <div className="tp-swatch-dots">
                <span className="tp-dot" style={{ background: theme.preview.bg    }} />
                <span className="tp-dot" style={{ background: theme.preview.card  }} />
                <span className="tp-dot" style={{ background: theme.preview.accent1 }} />
                <span className="tp-dot" style={{ background: theme.preview.accent2 }} />
              </div>
              <span className="tp-swatch-name">{locName}</span>
              {isActive && <span className="tp-swatch-check">✓</span>}
            </button>
          );
        })}
      </div>
 
      {/* ── Floating phone preview panel ── */}
      {previewOpen && (
        <div className="tp-preview-panel">
          <div className="tp-preview-label">
            {themeLocale[displayTheme.id]?.name || displayTheme.name}
          </div>
          <div className="tp-phone-frame">
            <PhonePreview
              theme={displayTheme}
              pageData={pageData}
              profilePicFile={profilePicFile}
              coverPhotoFile={coverPhotoFile}
            />
            <div className="tp-phone-home-bar" />
          </div>
          <p className="tp-preview-hint">
            {t.setup?.themePreviewHint || "Hover a theme above to preview · Click to select"}
          </p>
        </div>
      )}
    </div>
  );
}