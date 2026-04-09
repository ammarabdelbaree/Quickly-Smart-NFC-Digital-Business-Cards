import React, { useState, useEffect, useRef } from "react";
import { FaFacebook, FaInstagram, FaLinkedin, FaWhatsapp, FaTelegram, FaSnapchat, FaYoutube, FaLink } from "react-icons/fa";
import { FaXTwitter, FaThreads } from "react-icons/fa6";
import { TiDeleteOutline } from "react-icons/ti";
import axios from "axios";
import { supabase } from "./supabase";
import { useTranslation } from "../LanguageContext";
import PhoneInput from "./PhoneInput";
import ThemePicker from "./ThemePicker";
import "../style/ThemePicker.css";

const MAX_IMAGES_TOTAL = 1 * 1024 * 1024;

const restoreWaPhone = (links) =>
  (links || []).map((sm) => {
    if (sm.platform === "whatsapp" && sm.url?.startsWith("https://wa.me/")) {
      return { ...sm, waPhone: "+" + sm.url.replace("https://wa.me/", "") };
    }
    return sm;
  });

const normalizeUrl = (val) => {
  if (!val || !val.trim()) return val;
  const trimmed = val.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  if (trimmed.includes(".")) return `https://${trimmed}`;
  return trimmed;
};

const fileSize = (f) => (f instanceof File ? f.size : 0);

function SetupPage({ tagId, onSave, onLogout }) {
  const { t } = useTranslation();
  const s = t.setup;

  const [pageData, setPageData] = useState({
    name: "", title: "", phone: "", email: "",
    phones: [], emails: [], description: "", links: [],
    theme: "default",   // ← NEW
  });
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [profilePicDeleted, setProfilePicDeleted] = useState(false);
  const [coverPhotoDeleted, setCoverPhotoDeleted] = useState(false);

  const profilePicRef = useRef(profilePicFile);
  const coverPhotoRef = useRef(coverPhotoFile);
  useEffect(() => { profilePicRef.current = profilePicFile; }, [profilePicFile]);
  useEffect(() => { coverPhotoRef.current = coverPhotoFile; }, [coverPhotoFile]);

  const profileInputRef = useRef(null);
  const coverInputRef   = useRef(null);

  // ── LOAD DATA ──────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setFetching(true);
      let serverData = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/edit-data/${tagId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        serverData = res.data || {};
      } catch { /* fall back to draft */ }

      let draft = null;
      try {
        const draftJson = localStorage.getItem(`setup_draft_${tagId}`);
        if (draftJson) draft = JSON.parse(draftJson);
      } catch {
        localStorage.removeItem(`setup_draft_${tagId}`);
      }

      const base = serverData || {};
      const d    = draft?.pageData || {};

      const rawLinks = Array.isArray(d.links) && d.links.length
        ? d.links
        : Array.isArray(base.links) ? base.links : [];

      setPageData({
        name:        base.name        || d.name        || "",
        title:       base.title       || d.title       || "",
        phone:       base.phone       || d.phone       || "",
        email:       base.email       || d.email       || "",
        description: base.description || d.description || "",
        theme:       base.theme       || d.theme       || "default",  // ← NEW

        phones: Array.isArray(base.phones) && base.phones.length
          ? base.phones
          : Array.isArray(d.phones) ? d.phones : [],

        emails: Array.isArray(base.emails) && base.emails.length
          ? base.emails
          : Array.isArray(d.emails) ? d.emails : [],

        links: restoreWaPhone(rawLinks),
      });

      setProfilePicFile(base.profilePic || draft?.profilePic || null);
      setCoverPhotoFile(base.coverPhoto || draft?.coverPhoto || null);
      setFetching(false);
    };
    loadData();
  }, [tagId]);

  // ── AUTO-SAVE DRAFT ────────────────────────────────────────
  useEffect(() => {
    if (!tagId) return;
    const handler = setTimeout(() => {
      const draft = {
        pageData,
        profilePic: typeof profilePicFile === "string" ? profilePicFile : null,
        coverPhoto: typeof coverPhotoFile === "string" ? coverPhotoFile : null,
      };
      localStorage.setItem(`setup_draft_${tagId}`, JSON.stringify(draft));
    }, 1000);
    return () => clearTimeout(handler);
  }, [tagId, pageData, profilePicFile, coverPhotoFile]);

  // ── IMAGE SIZE GUARD ───────────────────────────────────────
  const checkImageSizes = (newFile, slot) => {
    const profileSize = slot === "profile" ? fileSize(newFile) : fileSize(profilePicRef.current);
    const coverSize   = slot === "cover"   ? fileSize(newFile) : fileSize(coverPhotoRef.current);
    const total = profileSize + coverSize;
    if (total > MAX_IMAGES_TOTAL) {
      const usedKB  = Math.round(total / 1024);
      const limitKB = Math.round(MAX_IMAGES_TOTAL / 1024);
      return s.errors?.imagesTooLarge ||
        `Combined image size (${usedKB} KB) exceeds the ${limitKB} KB limit.`;
    }
    return null;
  };

  // ── IMAGE UPLOAD ───────────────────────────────────────────
  const uploadImage = async (file, bucket) => {
    if (!file) return null;
    if (typeof file === "string" && file.startsWith("https://")) return file;
    const { data: { user } } = await supabase.auth.getUser();
    const filePath = `${user.id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDeleteProfilePic = () => {
    setProfilePicFile(null);
    setProfilePicDeleted(true);
    if (profileInputRef.current) profileInputRef.current.value = "";
  };

  const handleDeleteCoverPhoto = () => {
    setCoverPhotoFile(null);
    setCoverPhotoDeleted(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  // ── SAVE ───────────────────────────────────────────────────
  const savePage = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setErrorMsg(s.errors.notLoggedIn);
    if (!pageData.name || !pageData.phone) return setErrorMsg(s.errors.missingFields);

    const totalSize = fileSize(profilePicFile) + fileSize(coverPhotoFile);
    if (totalSize > MAX_IMAGES_TOTAL) {
      return setErrorMsg(s.errors?.imagesTooLarge || "Combined image size exceeds 1 MB.");
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const profilePicUrl = profilePicDeleted && !profilePicFile
        ? null
        : await uploadImage(profilePicFile, "profile-pics");

      const coverPhotoUrl = coverPhotoDeleted && !coverPhotoFile
        ? null
        : await uploadImage(coverPhotoFile, "cover-photos");

      const processedLinks = pageData.links.map((sm) => {
        if (sm.platform === "whatsapp" && sm.waPhone) {
          const { waPhone, ...rest } = sm;
          return { ...rest, url: `https://wa.me/${sm.waPhone.replace(/^\+/, "")}` };
        }
        const { waPhone, ...rest } = sm;
        return rest;
      });

      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/save-page`,
        {
          tagId,
          pageData: { ...pageData, links: processedLinks }, // theme is inside pageData
          profilePic: profilePicUrl,
          coverPhoto: coverPhotoUrl,
        },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      localStorage.removeItem(`setup_draft_${tagId}`);
      setSuccessMsg(s.successMsg);
      setTimeout(() => onSave(), 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || s.errors.saveFailed);
    } finally {
      setLoading(false);
    }
  };

  // ── HELPERS ────────────────────────────────────────────────
  const addSocial = (platform) => {
    setPageData({
      ...pageData,
      links: [...pageData.links, { platform, url: "", isCustomLink: platform === "link" }],
    });
  };

  const getIcon = (platform) => {
    switch (platform) {
      case "facebook":  return <FaFacebook  size={24} />;
      case "instagram": return <FaInstagram size={24} />;
      case "linkedin":  return <FaLinkedin  size={24} />;
      case "whatsapp":  return <FaWhatsapp  size={24} />;
      case "instapay":  return <img style={{ width: "22px", height: "22px" }} src="https://upload.wikimedia.org/wikipedia/commons/2/20/InstaPay_Logo.png" alt="instapay" />;
      case "telegram":  return <FaTelegram  size={24} />;
      case "twitter":   return <FaXTwitter  size={24} />;
      case "threads":   return <FaThreads   size={24} />;
      case "snapchat":  return <FaSnapchat  size={24} />;
      case "youtube":   return <FaYoutube   size={24} />;
      default:          return <FaLink      size={24} />;
    }
  };

  const removeItem = (list, index) => {
    const newList = [...pageData[list]];
    newList.splice(index, 1);
    setPageData({ ...pageData, [list]: newList });
  };

  const updateItem = (list, index, field, value) => {
    const newList = [...pageData[list]];
    newList[index][field] = value;
    setPageData({ ...pageData, [list]: newList });
  };

  if (fetching) return <div>{t.common.loading}</div>;

  const imgPreviewStyle = (round) => ({
    width: round ? 80 : "100%", height: 80,
    borderRadius: round ? "50%" : 8,
    marginBottom: 10, objectFit: "cover",
  });

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="page setup-page animate-fade-in">
      <nav className="setup-nav">
        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          <button onClick={onLogout} className="logout-btn"
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem" }}>
            {t.common.viewProfile}
          </button>
        </div>
      </nav>

      <h2>{s.title}</h2>

      {/* Profile Pic */}
      <div className="form-group">
        <label>{s.profilePicLabel}</label>
        {profilePicFile && (
          <div style={{ position: "relative", display: "inline-block", marginBottom: 10 }}>
            <img
              src={typeof profilePicFile === "string" ? profilePicFile : URL.createObjectURL(profilePicFile)}
              alt="Profile" style={{ ...imgPreviewStyle(true), marginBottom: 0 }}
            />
            <button type="button" onClick={handleDeleteProfilePic}
              style={{ position:"absolute",top:-6,right:-6,width:24,height:24,minHeight:24,minWidth:24,padding:0,margin:0,borderRadius:"50%",background:"rgba(255,0,106,0.9)",border:"2px solid var(--bg-card)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,lineHeight:1,zIndex:2 }}>
              ×
            </button>
          </div>
        )}
        <input ref={profileInputRef} type="file" accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0]; if (!file) return;
            const sizeErr = checkImageSizes(file, "profile");
            if (sizeErr) { setErrorMsg(sizeErr); e.target.value = ""; return; }
            setErrorMsg(""); setProfilePicFile(file); setProfilePicDeleted(false);
          }} />
      </div>

      {/* Cover Photo */}
      <div className="form-group">
        <label>{s.coverPhotoLabel}</label>
        {coverPhotoFile && (
          <div style={{ position: "relative", marginBottom: 10 }}>
            <img
              src={typeof coverPhotoFile === "string" ? coverPhotoFile : URL.createObjectURL(coverPhotoFile)}
              alt="Cover" style={{ ...imgPreviewStyle(false), marginBottom: 0 }}
            />
            <button type="button" onClick={handleDeleteCoverPhoto}
              style={{ position:"absolute",top:6,right:6,width:28,height:28,minHeight:28,minWidth:28,padding:0,margin:0,borderRadius:"50%",background:"rgba(255,0,106,0.88)",border:"2px solid var(--bg-card)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,lineHeight:1,zIndex:2 }}>
              ×
            </button>
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0]; if (!file) return;
            const sizeErr = checkImageSizes(file, "cover");
            if (sizeErr) { setErrorMsg(sizeErr); e.target.value = ""; return; }
            setErrorMsg(""); setCoverPhotoFile(file); setCoverPhotoDeleted(false);
          }} />
      </div>

      {/* Name */}
      <div className="form-group">
        <label>{s.nameLabel}</label>
        <input value={pageData.name} onChange={(e) => setPageData({ ...pageData, name: e.target.value })} />
      </div>

      {/* Title */}
      <div className="form-group">
        <label>{s.titleFieldLabel}</label>
        <input value={pageData.title} onChange={(e) => setPageData({ ...pageData, title: e.target.value })} />
      </div>

      {/* Description */}
      <div className="form-group">
        <label>{s.descriptionLabel}</label>
        <textarea value={pageData.description} onChange={(e) => setPageData({ ...pageData, description: e.target.value })} />
      </div>

      {/* Emails */}
      <div className="form-group">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <label>{s.emailLabel}</label>
          <label style={{ textDecoration:"underline", fontSize:"12px", cursor:"pointer" }}
            onClick={() => setPageData({ ...pageData, emails: [...pageData.emails, { address: "" }] })}>
            {s.emailAddLabel}
          </label>
        </div>
        {pageData.emails.length > 0
          ? pageData.emails.map((em, i) => (
              <div key={i} className="input-with-remove">
                <input value={em.address}
                  onChange={(e) => {
                    const newEmails = [...pageData.emails];
                    newEmails[i] = { address: e.target.value };
                    setPageData({ ...pageData, email: i === 0 ? e.target.value : pageData.email, emails: newEmails });
                  }} />
                {pageData.emails.length > 1 && (
                  <button onClick={() => {
                    const newEmails = pageData.emails.filter((_, idx) => idx !== i);
                    setPageData({ ...pageData, email: newEmails[0]?.address || "", emails: newEmails });
                  }} className="remove-btn"><TiDeleteOutline size={20} /></button>
                )}
              </div>
            ))
          : <input value={pageData.email}
              onChange={(e) => setPageData({ ...pageData, email: e.target.value, emails: [{ address: e.target.value }] })} />
        }
      </div>

      {/* Phones */}
      <div className="form-group">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <label>{s.phoneLabel}</label>
          <label style={{ textDecoration:"underline", fontSize:"12px", cursor:"pointer" }}
            onClick={() => setPageData({ ...pageData, phones: [...pageData.phones, { number: "" }] })}>
            {s.phoneAddLabel}
          </label>
        </div>
        <PhoneInput value={pageData.phone}
          onChange={(val) => {
            const updatedPhones = [...pageData.phones];
            updatedPhones[0] = { number: val };
            setPageData({ ...pageData, phone: val, phones: updatedPhones });
          }} />
        {pageData.phones.filter((_, i) => i !== 0).map((ph, i) => (
          <div key={i + 1} className="input-with-remove">
            <PhoneInput value={ph.number} onChange={(val) => updateItem("phones", i + 1, "number", val)} />
            <button onClick={() => removeItem("phones", i + 1)} className="remove-btn"><TiDeleteOutline size={20} /></button>
          </div>
        ))}
      </div>

      {/* Social Links */}
      <section className="setup-section">
        <div className="section-header">
          <h3>{s.socialMediaTitle}</h3>
          <div className="sm-icons">
            <button className="add-btn" onClick={() => addSocial("facebook")}><FaFacebook size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("instagram")}><FaInstagram size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("linkedin")}><FaLinkedin size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("whatsapp")}><FaWhatsapp size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("instapay")}>{getIcon("instapay")}</button>
            <button className="add-btn" onClick={() => addSocial("telegram")}><FaTelegram size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("snapchat")}><FaSnapchat size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("twitter")}><FaXTwitter size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("threads")}><FaThreads size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("youtube")}><FaYoutube size={22} /></button>
            <button className="add-btn" onClick={() => addSocial("link")}><FaLink size={22} /></button>
          </div>
        </div>
        {pageData.links.map((sm, i) =>
          sm.isCustomLink ? (
            <div key={i} className="dynamic-row custom-link-row">
              <div className="add-btn" style={{ flexShrink: 0 }}><FaLink size={20} /></div>
              <input className="custom-link-label-input" placeholder={s.linkLabelPlaceholder || "Label"}
                value={sm.label || ""} onChange={(e) => updateItem("links", i, "label", e.target.value)}
                style={{ margin: 0, minWidth: 0 }} />
              <input className="custom-link-url-input" placeholder={s.urlPlaceholder || "https://..."}
                value={sm.url} dir="ltr" style={{ textAlign:"left", margin:0 }}
                onChange={(e) => updateItem("links", i, "url", e.target.value)}
                onBlur={(e) => { const n = normalizeUrl(e.target.value); if (n !== e.target.value) updateItem("links", i, "url", n); }} />
                <button onClick={() => removeItem("links", i)} className="remove-btn"><TiDeleteOutline size={20} /></button>
            </div>
          ) : (
            <div key={i} className="dynamic-row" style={{ alignItems:"center" }}>
              <div className="add-btn" style={{ flexShrink: 0 }}>{getIcon(sm.platform)}</div>
              <div className="link-inputs">
                {sm.platform === "whatsapp" ? (
                  <PhoneInput value={sm.waPhone || ""} onChange={(val) => updateItem("links", i, "waPhone", val)}
                  placeholder={s.whatsappPlaceholder || "XXXXXXXXXX"} />
                ) : (
                  <input placeholder={s.urlPlaceholder} value={sm.url} dir="ltr"
                  style={{ textAlign:"left", margin:0 }}
                  onChange={(e) => updateItem("links", i, "url", e.target.value)}
                  onBlur={(e) => { const n = normalizeUrl(e.target.value); if (n !== e.target.value) updateItem("links", i, "url", n); }} />
                )}
              </div>
              <button onClick={() => removeItem("links", i)} className="remove-btn"><TiDeleteOutline size={20} /></button>
            </div>
          )
        )}
      </section>

      {/* ── THEME PICKER — bottom of form ── */}    {/* ← NEW SECTION */}
      <ThemePicker
        selectedTheme={pageData.theme || "default"}
        onChange={(id) => setPageData({ ...pageData, theme: id })}
        pageData={pageData}
        profilePicFile={profilePicFile}
        coverPhotoFile={coverPhotoFile}
      />

      {errorMsg   && <div className="error-banner">{errorMsg}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      <button className="btn primary-btn" style={{ marginTop: "2rem" }}
        onClick={savePage} disabled={loading}>
        {loading ? t.common.saving : t.common.saveChanges}
      </button>
    </div>
  );
}

export default SetupPage;