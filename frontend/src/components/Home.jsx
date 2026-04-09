// Home.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../LanguageContext";
import "../style/Home.css";
import {THEMES} from "../themes"
import {
  FaInstagram, FaFacebook, FaWhatsapp,
  FaQrcode, FaMobileAlt, FaBolt, FaPhoneAlt,
  FaLinkedin, FaTelegram, FaSnapchat, FaYoutube, FaLink,
  FaPlay, FaPause,
} from "react-icons/fa";
import { FaXTwitter, FaThreads } from "react-icons/fa6";
import { MdNfc, MdOutlineContactPage, MdOutlineShare, MdOutlinePalette } from "react-icons/md";
import { HiOutlineMail } from "react-icons/hi";

const API     = process.env.REACT_APP_API_BASE_URL;
const BUY_URL = "https://www.quicklynfc.store";

// ── Hash router ──────────────────────────────────────────────
const PAGES = { home: "", cards: "cards", how: "how" };
function getHash() { return window.location.hash.replace(/^#!?/, "") || ""; }
function useHashRouter() {
  const [page, setPage] = useState(getHash);
  useEffect(() => {
    const h = () => setPage(getHash());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const navigate = (p) => { window.location.hash = p ? `#${p}` : "#"; };
  return { page, navigate };
}

// ── Nav ──────────────────────────────────────────────────────
function Nav({ navigate, currentPage }) {
  const { t, lang, toggleLang } = useTranslation();
  const h = t.home;
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { key: PAGES.cards, label: h.nav.cards },
    { key: PAGES.how,   label: h.nav.howItWorks },
  ];
  const go = (k) => { navigate(k); setOpen(false); };

  return (
    <nav className={`home-nav${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">
        {/* Logo — pointer-events only on click, NO hover effect on the text */}
        <button className="logo-btn" onClick={() => go("")} aria-label="Go to home">
          <span className="logo-text">Quickly</span>
        </button>

        <ul className="nav-links">
          {links.map(({ key, label }) => (
            <li key={key}>
              <button className={`nav-link-btn${currentPage === key ? " active" : ""}`}
                onClick={() => go(key)}>{label}</button>
            </li>
          ))}
        </ul>

        <div className="nav-right">
          <button className="lang-pill" onClick={toggleLang} aria-label="Switch language">
            {lang === "en" ? "ع" : "EN"}
          </button>
          <a className="nav-cta" href={BUY_URL} target="_blank" rel="noreferrer">
            {h.nav.buyNow}
          </a>
          <button className={`hamburger${open ? " open" : ""}`}
            onClick={() => setOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </div>

      <div className={`mobile-drawer${open ? " open" : ""}`}>
        <div className="drawer-inner">
          {links.map(({ key, label }) => (
            <button key={key}
              className={`drawer-link${currentPage === key ? " active" : ""}`}
              onClick={() => go(key)}>{label}</button>
          ))}
          <a className="drawer-cta" href={BUY_URL} target="_blank" rel="noreferrer"
            onClick={() => setOpen(false)}>{h.nav.buyNow}</a>
          <button className="drawer-lang" onClick={() => { toggleLang(); setOpen(false); }}>
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Footer ───────────────────────────────────────────────────
function Footer() {
  const { t } = useTranslation();
  return (
    <>
      <div className="footer-divider" />
      <footer className="home-footer">
        <p className="footer-copy">{t.home.footer.copyright}</p>
        <div className="sm-accounts">
          <a href="https://www.instagram.com/quickly.nfc/" target="_blank" rel="noreferrer"><FaInstagram size={17} /></a>
          <a href="https://web.facebook.com/profile.php?id=61553925994032" target="_blank" rel="noreferrer"><FaFacebook size={17} /></a>
          <a href="https://wa.me/201154391661" target="_blank" rel="noreferrer"><FaWhatsapp size={17} /></a>
        </div>
      </footer>
    </>
  );
}

function BackBtn({ navigate }) {
  const { lang } = useTranslation();
  return (
    <button className="back-btn" onClick={() => navigate("")}>
      {lang === "ar" ? "→ الرئيسية" : "← Home"}
    </button>
  );
}

function PlatformIcon({ platform, size = 18 }) {
  const map = {
    facebook: <FaFacebook size={size}/>, instagram: <FaInstagram size={size}/>,
    linkedin: <FaLinkedin size={size}/>, whatsapp:  <FaWhatsapp  size={size}/>,
    telegram: <FaTelegram size={size}/>, snapchat:  <FaSnapchat  size={size}/>,
    twitter:  <FaXTwitter size={size}/>, threads:   <FaThreads   size={size}/>,
    youtube:  <FaYoutube  size={size}/>,
  };
  return map[platform?.toLowerCase()] || <FaLink size={size}/>;
}

// ── Hero video — drop /public/demo.mp4 to activate ──────────
function HeroVideo() {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  // Change to true once you place demo.mp4 in /public
  const hasFile = true;

  const toggle = () => {
    const v = ref.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  if (!hasFile) return (
    <div className="hero-video-wrap placeholder">
      <div className="video-placeholder-inner">
        <div className="video-play-ring"><FaPlay size={24} /></div>
        <p className="video-placeholder-label">Demo Video</p>
        <p className="video-placeholder-hint">Place demo.mp4 in /public and set hasFile=true</p>
      </div>
    </div>
  );

  return (
    <div className="hero-video-wrap" onClick={toggle}>
      <video ref={ref} src="/demo.mp4" className="hero-video"
        loop muted playsInline onEnded={() => setPlaying(false)} />
      <div className={`video-overlay${playing ? " hidden" : ""}`}>
        <div className="video-play-ring">
          {playing ? <FaPause size={22}/> : <FaPlay size={22}/>}
        </div>
      </div>
    </div>
  );
}

// ── Profile preview — exact replica of PublicPage card ───────
function ProfilePreviewSection() {
  const { t } = useTranslation();
  const p = t.home.preview;

  const socialPlatforms = ["linkedin", "instagram", "whatsapp"];

  return (
    <section className="pp-section">
      {/* Left: text */}
      <div className="pp-text">
        <span className="pp-badge"><MdNfc size={13}/> {p.badge}</span>
        <h2 className="pp-title">{p.title}</h2>
        <p className="pp-sub">{p.sub}</p>

        {/* Feature bullet points — from i18n, fully translated */}
        <ul className="pp-bullets">
          {p.bullets.map((b, i) => (
            <li key={i} className="pp-bullet">
              <span className="pp-bullet-dot" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Right: phone frame matching PublicPage EXACTLY */}
      <div className="pp-phone-wrap">
        <div className="pp-ambient-l" />
        <div className="pp-ambient-r" />

        <div className="pp-phone">
          {/* ── COVER PHOTO (same as .cover-photo in PublicPage) ── */}
          <div className="pp-cover">
            <div className="pp-cover-overlay" />
          </div>

          {/* ── PROFILE PIC (same as .profile-container/.profile-pic) ── */}
          <div className="pp-profile-container">
            <div className="pp-profile-pic">
              <span className="pp-initial">{p.demoName[0]}</span>
            </div>
          </div>

          {/* ── CARD CONTENT ── */}
          <div className="pp-card-content">

            {/* Identity */}
            <div className="pp-identity">
              <div className="pp-user-name">{p.demoName}</div>
              <div className="pp-user-title">{p.demoTitle}</div>
            </div>

            {/* Bio */}
            <div className="pp-bio-section">
              <p>{p.demoBio}</p>
            </div>

            {/* Save Contact btn */}
            <div className="pp-action-btns">
              <div className="pp-save-btn">{t.public.saveContact}</div>
            </div>

            {/* Contact grid: phone + email (same as .contact-grid) */}
            <div className="pp-contact-grid">
              <div className="pp-contact-item">
                <div className="pp-icon-box"><FaPhoneAlt size={12}/></div>
                <span>{p.phoneLabel}</span>
              </div>
              <div className="pp-contact-item">
                <div className="pp-icon-box"><HiOutlineMail size={14}/></div>
                <span>{p.emailLabel}</span>
              </div>
            </div>

            {/* Social links (same as .links-list / .custom-link-card) */}
            <div className="pp-links-list">
              {socialPlatforms.map((platform, i) => (
                <div key={i} className="pp-link-card">
                  <div className="pp-link-icon"><PlatformIcon platform={platform} size={14}/></div>
                  <span className="pp-link-text">{p.demoLinks[i]}</span>
                  <span className="pp-link-arrow">→</span>
                </div>
              ))}
            </div>

            {/* Footer branding */}
            <div className="pp-footer-brand">
              {t.common.poweredBy} <strong>Quickly</strong>
            </div>
            {/* Status bar notch */}
          </div>
          <div className="pp-statusbar"><div className="pp-notch" /></div>
        </div>
      </div>
    </section>
  );
}

// ── Mini profile card ────────────────────────────────────────
const ACCENT_COLORS = ["#a855f7","#ec4899","#38bdf8","#f59e0b","#10b981"];

function MiniProfileCard({ tag, accentColor, expanded, onToggle }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!expanded || data || loading || err) return;
    setLoading(true);
    fetch(`${API}/card/${tag.tagId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [expanded, tag.tagId, data, loading, err]);

  const initials = (data?.name || tag.tagId || "?")[0].toUpperCase();

  const saveContact = () => {
    if (!data?.name) return;
    const phones = data.phones?.length ? data.phones : data.phone ? [{ number: data.phone }] : [];
    const emails = data.emails?.length ? data.emails : data.email ? [{ address: data.email }] : [];
    const vcard = ["BEGIN:VCARD","VERSION:3.0",`FN:${data.name}`,
      data.title ? `TITLE:${data.title}` : null,
      ...phones.map(p => `TEL;TYPE=CELL:${p.number}`),
      ...emails.map(e => `EMAIL:${e.address}`),
      data.description ? `NOTE:${data.description}` : null,
      "END:VCARD"].filter(Boolean).join("\n");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${data.name}.vcf`; a.click();
    URL.revokeObjectURL(url);
  };

  const allPhones = data ? (data.phones?.length ? data.phones : data.phone ? [{ number: data.phone }] : []) : [];
  const allEmails = data ? (data.emails?.length ? data.emails : data.email ? [{ address: data.email }] : []) : [];

  return (
    <div className={`mini-card${expanded ? " expanded" : ""}`}
      style={{ "--card-accent": accentColor }} onClick={onToggle}>
      <div className="mini-cover" style={{
        background: data?.coverPhoto
          ? `url(${data.coverPhoto}) center/cover`
          : `linear-gradient(135deg,${accentColor}44,${accentColor}18)`,
      }}/>
      <div className="mini-avatar-wrap">
        {data?.profilePic
          ? <img src={data.profilePic} alt="" className="mini-avatar-img" style={{ borderColor: accentColor }}/>
          : <div className="mini-avatar" style={{ borderColor: accentColor }}>
              <span style={{ color: accentColor, fontSize: "1.35rem", fontWeight: 800 }}>{initials}</span>
            </div>
        }
      </div>
      <div className="mini-body">
        <h3 className="mini-name">{data?.name || tag.tagId}</h3>
        {data?.title && <p className="mini-role">{data.title}</p>}
        {expanded && (
          <div className="mini-expanded" onClick={e => e.stopPropagation()}>
            {loading && <p className="mini-loading">Loading…</p>}
            {err     && <p className="mini-loading" style={{ color: "#ff6b6b" }}>Could not load profile.</p>}
            {data && <>
              {allPhones.map((ph, i) => (
                <a key={i} href={`tel:${ph.number}`} className="mini-contact">
                  <span className="mini-icon"><FaPhoneAlt size={13}/></span>
                  <span>{ph.number}</span>
                </a>
              ))}
              {allEmails.map((em, i) => (
                <a key={i} href={`mailto:${em.address}`} className="mini-contact">
                  <span className="mini-icon"><HiOutlineMail size={15}/></span>
                  <span>{em.address}</span>
                </a>
              ))}
              {data.links?.length > 0 && (
                <div className="mini-links">
                  {data.links.slice(0, 5).map((lk, i) => (
                    <a key={i} href={lk.url || "#"} target="_blank" rel="noreferrer"
                      className="mini-link-btn" style={{ color: accentColor }}
                      onClick={e => e.stopPropagation()}>
                      <PlatformIcon platform={lk.platform} size={16}/>
                    </a>
                  ))}
                </div>
              )}
              <button className="mini-save-btn" style={{ background: accentColor }} onClick={saveContact}>
                {t.public.saveContact}
              </button>
              <a href={`/${tag.tagId}`} className="mini-view-link" target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}>
                {t.home.cards.viewFull} →
              </a>
            </>}
          </div>
        )}
        <div className="mini-tap-hint">{expanded ? "▲" : "▼"}</div>
      </div>
    </div>
  );
}

function ThemesShowcase() {
  const { t } = useTranslation();
  const h = t.home;

  return (
    <section className="themes-showcase">
      <div className="themes-showcase__header">
        <span className="themes-showcase__badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/>
            <circle cx="8.5"  cy="7.5" r="1"/><circle cx="6.5"  cy="12.5" r="1"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
          </svg>
          {h?.themes?.badge || "Personalize"}
        </span>
        <h2 className="themes-showcase__title">
          {/* Dynamically show the count */}
          {h?.themes?.title || "Beautiful Themes"}
        </h2>
        <p className="themes-showcase__sub">
          {h?.themes?.sub || "Pick a palette that fits your brand. From professional minimalism to vibrant energy."}
        </p>
      </div>

      <div className="themes-showcase__row">
        {THEMES.map((theme) => (
          <div key={theme.id} className="themes-showcase__card"
            style={{ 
              "--ts-bg": theme.preview.bg, 
              "--ts-card": theme.preview.card,
              "--ts-a1": theme.preview.accent1, 
              "--ts-a2": theme.preview.accent2 
            }}>
            
            <div className="ts-mini-card" style={{ background: theme.preview.card }}>
              <div className="ts-mini-cover"
                style={{ background: `linear-gradient(135deg, ${theme.preview.accent1}88, ${theme.preview.accent2}88)` }} />
              
              {/* Profile Circle */}
              <div className="ts-mini-avatar"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.preview.accent1}, ${theme.preview.accent2})`,
                  borderColor: theme.preview.card 
                }} />
              
              {/* Name and Subtitle skeletons */}
              <div className="ts-mini-name"
                style={{ background: `linear-gradient(90deg, ${theme.preview.accent1}, ${theme.preview.accent2})` }} />
              <div className="ts-mini-sub"
                style={{ background: `${theme.preview.accent1}44` }} />

              {/* Link item skeletons */}
              {[0, 1, 2].map((i) => (
                <div key={i} className="ts-mini-link"
                  style={{ 
                    background: `${theme.preview.accent1}18`,
                    borderColor: `${theme.preview.accent1}28` 
                  }}>
                  <div className="ts-mini-link-dot"
                    style={{ background: `linear-gradient(135deg, ${theme.preview.accent1}, ${theme.preview.accent2})` }} />
                  <div className="ts-mini-link-bar"
                    style={{ background: `${theme.preview.accent1}55` }} />
                </div>
              ))}
            </div>

            {/* Bottom color indicators */}
            <div className="ts-bg-pill" style={{ background: theme.preview.bg }}>
              <span className="ts-bg-dot" style={{ background: theme.preview.accent1 }} />
              <span className="ts-bg-dot" style={{ background: theme.preview.accent2 }} />
            </div>

            <span className="ts-name">{theme.name}</span>
          </div>
        ))}
      </div>

      <p className="themes-showcase__note">
        {/* Updated list of themes */}
        {h?.themes?.note || "Includes Arctic, Paper, Onyx, Quickly, Ocean, Forest, Ember, and B&W."}
      </p>
    </section>
  );
}


// ── Cards page ───────────────────────────────────────────────
function CardsPage({ navigate }) {
  const { t } = useTranslation();
  const h = t.home.cards;
  const [tags,setTags]         = useState([]);
  const [loading,setLoading]   = useState(true);
  const [fetchErr,setFetchErr] = useState(false);
  const [expanded,setExpanded] = useState(null);
  const [query,setQuery]       = useState("");

  const loadTags = useCallback(async () => {
    setLoading(true); setFetchErr(false);
    try {
      const res = await fetch(`${API}/public/tags`);
      if (!res.ok) throw new Error();
      setTags((await res.json()).tags || []);
    } catch { setFetchErr(true); }
    finally  { setLoading(false); }
  }, []);
  useEffect(() => { loadTags(); }, [loadTags]);

  // Filter by name or title, case-insensitive
  const filtered = query.trim()
    ? tags.filter(tag => {
        const q = query.trim().toLowerCase();
        return (
          (tag.name  || "").toLowerCase().includes(q) ||
          (tag.title || "").toLowerCase().includes(q) ||
          (tag.tagId || "").toLowerCase().includes(q)
        );
      })
    : tags;

  // Reset expanded when search changes
  useEffect(() => { setExpanded(null); }, [query]);

  return (
    <div className="subpage-shell">
      <BackBtn navigate={navigate}/>
      <h1 className="subpage-title">{h.title}</h1>
      <p className="subpage-sub">{h.sub}</p>

      {/* Search bar */}
      {!loading && !fetchErr && tags.length > 0 && (
        <div className="cards-search-wrap">
          <div className="cards-search-box">
            <svg className="cards-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input
              className="cards-search-input"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={h.searchPlaceholder}
              autoComplete="off"
            />
            {query && (
              <button className="cards-search-clear" onClick={() => setQuery("")} aria-label={h.clearSearch}>
                ✕
              </button>
            )}
          </div>
          {query && (
            <span className="cards-search-count">
              {filtered.length} / {tags.length}
            </span>
          )}
        </div>
      )}

      <div className="preview-section">
        {loading && <div className="tags-loading">{[0,1,2].map(i => <div key={i} className="mini-card-skeleton"/>)}</div>}
        {!loading && fetchErr && <div className="tags-empty"><MdNfc size={40} style={{opacity:.3,marginBottom:12}}/><p>{h.fetchError}</p></div>}
        {!loading && !fetchErr && tags.length===0 && <div className="tags-empty"><MdNfc size={40} style={{opacity:.3,marginBottom:12}}/><p>{h.noTags}</p></div>}
        {!loading && !fetchErr && tags.length>0 && filtered.length===0 && (
          <div className="tags-empty">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="none" style={{opacity:.3,marginBottom:12}}>
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p>{h.noResults}</p>
          </div>
        )}
        {!loading && !fetchErr && filtered.length>0 && (
          <div className="mini-cards-grid">
            {filtered.map((tag,i) => (
              <MiniProfileCard key={tag.tagId} tag={tag}
                accentColor={ACCENT_COLORS[i%ACCENT_COLORS.length]}
                expanded={expanded===i}
                onToggle={() => setExpanded(expanded===i ? null : i)}/>
            ))}
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}

// ── How It Works ─────────────────────────────────────────────
function HowItWorksPage({ navigate }) {
  const { t } = useTranslation();
  const h = t.home.how;
  return (
    <div className="subpage-shell">
      <BackBtn navigate={navigate}/>
      <h1 className="subpage-title">{h.title}</h1>
      <p className="subpage-sub">{h.sub}</p>
      <div className="steps-grid">
        {h.steps.map((s,i) => (
          <div className="step-card" key={i}>
            <div className="step-num">0{i+1}</div>
            <div className="step-icon">
              {[<MdNfc size={36}/>,<MdOutlineContactPage size={36}/>,<MdOutlineShare size={36}/>][i]}
            </div>
            <h3>{s.title}</h3><p>{s.body}</p>
          </div>
        ))}
      </div>
      <Footer/>
    </div>
  );
}

// ── Home landing ─────────────────────────────────────────────
function HomePage({ navigate }) {
  const { t, lang } = useTranslation();
  const h = t.home;
  const isRTL = lang === "ar";
  return (
    <div className="home-main">
      <section className={`hero${isRTL ? " hero-rtl" : ""}`}>
        <div className="hero-text">
          <div className="hero-badge"><FaBolt size={11}/><span>{h.hero.badge}</span></div>
          <h1 className="hero-headline">
            {h.hero.headline.split("\n").map((line,i) => <span key={i}>{line}<br/></span>)}
          </h1>
          <p className="hero-tagline">{h.hero.tagline}</p>
          <div className="hero-actions">
            <a className="cta-btn" href={BUY_URL} target="_blank" rel="noreferrer">{h.hero.cta}</a>
            <button className="cta-btn-outline" onClick={() => navigate(PAGES.cards)}>{h.hero.ctaSecondary}</button>
          </div>
        </div>
        <div className="hero-visual"><HeroVideo/></div>
      </section>

      <ProfilePreviewSection/>

      <ThemesShowcase/>

      <section className="features-section">
        <h2 className="section-title">{h.features.title}</h2>
        <div className="features-grid">
          {h.features.items.map((f,i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">
                {[<MdNfc size={24}/>,<FaQrcode size={22}/>,<FaMobileAlt size={22}/>,<MdOutlineShare size={24}/>, <MdOutlinePalette size={24} />][i]}
              </div>
              <h3>{f.title}</h3><p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-strip">
        <h2>{h.ctaStrip.title}</h2>
        <p>{h.ctaStrip.sub}</p>
        <a className="cta-btn large" href={BUY_URL} target="_blank" rel="noreferrer">{h.ctaStrip.btn}</a>
      </section>

      <Footer/>
    </div>
  );
}

export default function Home() {
  const { page, navigate } = useHashRouter();
  const render = () => {
    switch(page) {
      case PAGES.cards: return <CardsPage      navigate={navigate}/>;
      case PAGES.how:   return <HowItWorksPage navigate={navigate}/>;
      default:          return <HomePage       navigate={navigate}/>;
    }
  };
  return (
    <div className="home-page">
      <Nav navigate={navigate} currentPage={page}/>
      <div className="home-content">{render()}</div>
    </div>
  );
}