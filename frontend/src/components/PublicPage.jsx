import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  FaFacebook, FaInstagram, FaLinkedin, FaWhatsapp,
  FaTelegram, FaSnapchat, FaYoutube, FaLink, FaPhoneAlt,
} from "react-icons/fa";
import { FaXTwitter, FaThreads } from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import PropTypes from "prop-types";
import axios from "axios";
import QRCode from "qrcode";
import { useTranslation } from "../LanguageContext";
import { buildThemeStyle, getThemeQrColors } from "../themes";
import "../style/PublicPage.css";
import LanguageSwitcher from "../LanguageSwitcher";

const PublicPage = React.memo(({ tagId, onBack, handleRetry }) => {
  const [data, setData]         = useState({});
  const [loading, setLoading]   = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const profilePicUrl = useRef(null);
  const coverPhotoUrl = useRef(null);

  const { t } = useTranslation();
  const s = t.public;

  // ── Theme CSS vars cascaded down through the card ──────────
  const themeStyle = useMemo(() => buildThemeStyle(data.theme), [data.theme]);

  // ── Paint body + app-shell to match theme bg ───────────────
  useEffect(() => {
    const bgColor = themeStyle["--bg-color"];
    if (!bgColor) return;

    const prevBody = document.body.style.background;
    document.body.style.background = bgColor;

    const appShell = document.querySelector(".app-shell");
    const prevShell = appShell ? appShell.style.background : null;
    if (appShell) appShell.style.background = bgColor;

    return () => {
      document.body.style.background = prevBody;
      const shell = document.querySelector(".app-shell");
      if (shell) shell.style.background = prevShell || "";
    };
  }, [themeStyle]);

  // ── Theme-aware QR colors ──────────────────────────────────

  const getIcon = useCallback((platform) => {
    const platformName = platform?.toLowerCase().trim();
    const iconMap = {
      facebook:  <FaFacebook  size={22} />,
      instagram: <FaInstagram size={22} />,
      linkedin:  <FaLinkedin  size={22} />,
      whatsapp:  <FaWhatsapp  size={22} />,
      instapay:  <img
                   className="sm-icons add-btn"
                   style={{ width: "18px", height: "18px" }}
                   src="https://upload.wikimedia.org/wikipedia/commons/2/20/InstaPay_Logo.png"
                   alt="instapay"
                 />,
      telegram:  <FaTelegram  size={22} />,
      snapchat:  <FaSnapchat  size={22} />,
      twitter:   <FaXTwitter  size={22} />,
      threads:   <FaThreads   size={22} />,
      youtube:   <FaYoutube   size={22} />,
      phone:     <FaPhoneAlt  size={16} />,
      email:     <HiOutlineMail size={25} />,
    };
    return iconMap[platformName] || <FaLink size={24} />;
  }, []);

  // ── Real brand colors per platform ────────────────────────
  const getIconColor = useCallback((platform) => {
    const platformName = platform?.toLowerCase().trim();
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/card/${tagId}`
      );
      const cardData = res.data;
      setData(cardData);

      const ts = Date.now();
      profilePicUrl.current = cardData.profilePic
        ? `${cardData.profilePic}?t=${ts}`
        : null;
      coverPhotoUrl.current = cardData.coverPhoto
        ? `${cardData.coverPhoto}?t=${ts}`
        : null;

      const { dark, light } = getThemeQrColors(cardData.theme);
      const options = {
        width: 500,
        margin: 3,
        color: { dark, light },
        errorCorrectionLevel: "H",
      };
      const qr = await QRCode.toDataURL(window.location.href, options);
      setQrCodeUrl(qr);
    } catch {
      setErrorMsg(s.errorMsg);
    } finally {
      setLoading(false);
    }
  }, [tagId, s.errorMsg]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Re-generate QR whenever theme changes ─────────────────
  const prevThemeRef = useRef(null);
  useEffect(() => {
    if (!data.theme || data.theme === prevThemeRef.current) return;
    prevThemeRef.current = data.theme;
    if (!qrCodeUrl) return;
    const { dark, light } = getThemeQrColors(data.theme);
    QRCode.toDataURL(window.location.href, {
      width: 500,
      margin: 3,
      color: { dark, light },
      errorCorrectionLevel: "H",
    })
      .then(setQrCodeUrl)
      .catch(() => {});
  }, [data.theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadQrCode = useCallback(() => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `${data.name || "quickly-qr-code"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrCodeUrl, data.name]);

  const generateVCard = useMemo(() => {
    if (!data.name) return "";
    const phones = (data.phones || []).map(
      (ph) => `TEL;TYPE=CELL:${ph.number}`
    ).join("\n");
    const emails = (data.emails || []).map(
      (em) => `EMAIL:${em.address}`
    ).join("\n");
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${data.name}`,
      `TITLE:${data.title || ""}`,
      phones,
      emails,
      `NOTE:${data.description || ""}`,
      "END:VCARD",
    ].filter(Boolean).join("\n");
  }, [data]);

  const downloadVCard = () => {
    if (!generateVCard) return;
    const blob = new Blob([generateVCard], { type: "text/vcard" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${data.name || "contact"}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title =
      data.name && data.name.trim()
        ? data.name.trim()
        : window.location.hostname;

    if (navigator.share) {
      const payloads = [{ title, url }, { url }, { title }];
      for (const payload of payloads) {
        const canShare =
          typeof navigator.canShare === "function"
            ? navigator.canShare(payload)
            : true;
        if (!canShare) continue;
        try {
          await navigator.share(payload);
          return;
        } catch (err) {
          if (err?.name === "AbortError") return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert(s.linkCopied);
    } catch {
      window.prompt(s.copyManually || "Copy this link:", url);
    }
  };

  const allPhones = useMemo(() => {
    const phones = data.phones || [];
    if (!phones.length && data.phone) return [{ number: data.phone }];
    return phones.filter((ph) => ph.number && ph.number.trim() !== "");
  }, [data.phones, data.phone]);

  const allEmails = useMemo(() => {
    const emails = data.emails || [];
    if (!emails.length && data.email) return [{ address: data.email }];
    return emails.filter((em) => em.address && em.address.trim() !== "");
  }, [data.emails, data.email]);

  // ── Contact grid ────────────────────────────────────────────
  const ContactGrid = () => (
    <div className="contact-grid" role="group" aria-label="Direct contacts">
      <div className="phones">
        {allPhones.map((ph, i) => (
          <a
            key={`phone-${i}`}
            href={`tel:${ph.number}`}
            className="contact-item"
            aria-label={`${s.call || "Call"} ${data.name}${
              allPhones.length > 1 ? ` (${i + 1})` : ""
            }`}
          >
            <div
              className="icon-box add-btn"
              style={{ color: getIconColor("phone") }}
            >
              {getIcon("phone")}
            </div>
            <span>{ph.number}</span>
          </a>
        ))}
      </div>
      <div className="emails">
        {allEmails.map((em, i) => (
          <a
            key={`email-${i}`}
            href={`mailto:${em.address}`}
            className="contact-item"
            aria-label={`${s.email || "Email"} ${data.name}${
              allEmails.length > 1 ? ` (${i + 1})` : ""
            }`}
          >
            <div
              className="icon-box add-btn"
              style={{ color: getIconColor("phone") }}
            >
              {getIcon("email")}
            </div>
            <span>{em.address}</span>
          </a>
        ))}
      </div>
    </div>
  );

  // ── Links list ──────────────────────────────────────────────
  const Links = () => (
    <div className="links-list" role="list">
      {data.links?.map((sm, index) => {
        let displayLabel;
        if (sm.isCustomLink) {
          displayLabel = sm.label || sm.url;
        } else {
          const platformKey = sm.platform?.toLowerCase().trim();
          displayLabel =
            sm.label ||
            (s.platforms && s.platforms[platformKey]) ||
            sm.platform;
        }
        const platform = sm.isCustomLink ? "link" : sm.platform;
        return (
          <a
            key={index}
            href={sm.url}
            target="_blank"
            rel="noopener noreferrer"
            className="custom-link-card"
          >
            <div
              className="link-icon add-btn"
              style={{ color: getIconColor(platform) }}
            >
              {getIcon(platform)}
            </div>
            <span className="link-text">{displayLabel}</span>
            <span className="link-arrow">→</span>
          </a>
        );
      })}
    </div>
  );

  // ── Skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card-wrapper skeleton-wrapper animate-pulse">
        <div className="skeleton-cover" />
        <div className="card-content">
          <div className="profile-container">
            <div className="skeleton-avatar" />
          </div>
          <div className="identity-section">
            <div className="skeleton-text h-title" />
            <div className="skeleton-text h-subtitle" />
          </div>
          <div className="skeleton-text h-bio" />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="error-page">
        <h1>{errorMsg}</h1>
        <button onClick={handleRetry} className="btn primary-btn">
          {t.common.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="public-page-container animate-fade-in" style={themeStyle}>

      <div className="card-wrapper animate-fade-in">
        <div className="public-lang-switcher">
          <LanguageSwitcher />
        </div>

        {/* Cover photo */}
        <div
          className={`cover-photo${
            !coverPhotoUrl.current ? " default-cover" : ""
          }`}
          style={
            coverPhotoUrl.current
              ? { backgroundImage: `url(${coverPhotoUrl.current})` }
              : {}
          }
          role="img"
          aria-label={s.coverPhotoAlt || "Cover photo"}
        />

        {/* Profile picture */}
        <div className="profile-container">
          {profilePicUrl.current ? (
            <img
              src={profilePicUrl.current}
              alt={
                s.profilePicAlt
                  ? s.profilePicAlt.replace("{name}", data.name)
                  : `${data.name} profile`
              }
              className="profile-pic lazy-load themed-avatar-border"
              loading="lazy"
              onLoad={(e) => e.currentTarget.classList.add("loaded")}
            />
          ) : (
            <div
              className="profile-pic-placeholder themed-avatar-border"
              aria-label={`${data.name} avatar`}
            >
              {data.name ? data.name.charAt(0) : "?"}
            </div>
          )}
        </div>

        <div className="card-content">
          {/* Identity */}
          <div className="identity-section">
            <h1 className="user-name">{data.name}</h1>
            {data.title && <p className="user-title">{data.title}</p>}
          </div>

          {/* Bio */}
          {data.description && (
            <div className="bio-section">
              <p>{data.description}</p>
            </div>
          )}

          {/* Save contact */}
          <div className="action-buttons">
            <button onClick={downloadVCard} className="save-contact-btn">
              {s.saveContact}
            </button>
          </div>

          {/* Contacts + links */}
          <ContactGrid />
          <Links />

          {/* QR section */}
          {qrCodeUrl && (
            <>
              <div className="divider-gradient themed-divider" />
              <div className="qr-section">
                <img
                  src={qrCodeUrl}
                  alt={s.qrAlt || "QR Code"}
                  className="qr-code"
                  onClick={downloadQrCode}
                  style={{ cursor: "pointer" }}
                />
                <div className="qr-links">
                  <p onClick={handleShare} style={{ cursor: "pointer" }}>
                    {s.shareProfile}
                  </p>
                  <p onClick={downloadQrCode} style={{ cursor: "pointer" }}>
                    {s.downloadQr}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Admin edit link */}
          <div className="login-footer">
            <button className="admin-btn" onClick={onBack}>
              {s.adminEdit}
            </button>
          </div>

          <div
            className="footer-branding"
            onClick={() => (window.location.href = "/")}
            style={{ cursor: "pointer" }}
          >
            <p style={{ color: "rgba(138, 145, 168, 0.55)" }}>
              Powered by{" "}
              <strong
                style={{
                  background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontWeight: 700,
                }}
              >
                Quickly
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

PublicPage.propTypes = {
  tagId:       PropTypes.string.isRequired,
  onBack:      PropTypes.func.isRequired,
  handleRetry: PropTypes.func,
};

export default PublicPage;