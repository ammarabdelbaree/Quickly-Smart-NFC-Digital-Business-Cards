// AdminPanel.jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useTranslation } from "../LanguageContext";
import "../style/AdminPanel.css";

const API = process.env.REACT_APP_API_BASE_URL;

function Badge({ tag }) {
  // AdminPanel is internal — it gets its own LanguageContext from App's provider
  const { t } = useTranslation();
  const b = t.adminPanel.badges;

  if (!tag.isActive) return <span className="ap-badge deactivated">{b.deactivated}</span>;
  if (tag.isSetup)   return <span className="ap-badge active">{b.active}</span>;
  if (tag.ownerId)   return <span className="ap-badge claimed">{b.claimed}</span>;
  return               <span className="ap-badge unclaimed">{b.unclaimed}</span>;
}

function LoginScreen({ onLogin }) {
  const [secret, setSecret]   = useState("");
  const [error, setError]     = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const s = t.adminPanel.login;

  const attempt = async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/admin/login`, {}, { headers: { "x-admin-secret": secret } });
      onLogin(secret);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError(s.invalidSecret);
      } else if (!err?.response) {
        setError(s.backendUnreachable || "Cannot connect to server. Make sure the backend is running.");
      } else {
        setError(s.invalidSecret);
      }
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-login-wrapper">
      <div className={`ap-login-card ${shaking ? "shake" : ""}`}>
        <div className="ap-lock-icon">🔐</div>
        <h2 className="ap-login-title">{s.title}</h2>
        <p className="ap-login-sub">{s.subtitle}</p>
        <input
          type="password" className="ap-input" placeholder={s.placeholder}
          value={secret}
          onChange={(e) => { setSecret(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && attempt()}
          autoFocus
        />
        {error && <p className="ap-error-txt">{error}</p>}
        <button className="ap-btn-primary" onClick={attempt} disabled={loading}>
          {loading ? s.checking : s.enterBtn}
        </button>
      </div>
    </div>
  );
}

function Panel({ secret }) {
  const authHeaders = { headers: { "x-admin-secret": secret } };
  const { t } = useTranslation();
  const s = t.adminPanel.panel;
  const cols = s.cols;

  const [tags, setTags]         = useState([]);
  const [search, setSearch]     = useState("");
  const [newTagId, setNewTagId] = useState("");
  const [msg, setMsg]           = useState(null);
  const [loading, setLoading]   = useState(true);

  const flash = useCallback((text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/tags`, authHeaders);
      setTags(res.data.tags || []);
    } catch (err) {
      flash(s.loadFailed(err.response?.data?.error || err.message), "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const createTag = async () => {
    const id = newTagId.trim().toLowerCase();
    if (!id) return flash(s.noTagId, "error");
    try {
      const res = await axios.post(`${API}/admin/create-tag`, { tagId: id }, authHeaders);
      flash(s.created(id, res.data.code), "success");
      setNewTagId("");
      fetchTags();
    } catch (err) {
      flash(`❌ ${err.response?.data?.error || err.message}`, "error");
    }
  };

  const deactivateTag = async (tagId) => {
    if (!window.confirm(s.confirmDeactivate(tagId))) return;
    try {
      await axios.post(`${API}/admin/deactivate-tag`, { tagId }, authHeaders);
      flash(s.deactivated(tagId), "success");
      fetchTags();
    } catch (err) {
      flash(`❌ ${err.response?.data?.error || err.message}`, "error");
    }
  };

  const deleteTag = async (tagId) => {
    if (!window.confirm(s.confirmDelete(tagId))) return;
    try {
      await axios.post(`${API}/admin/delete-tag`, { tagId }, authHeaders);
      flash(s.deleted(tagId), "success");
      fetchTags();
    } catch (err) {
      flash(`❌ ${err.response?.data?.error || err.message}`, "error");
    }
  };

  const reactivateTag = async (tagId) => {
    try {
      await axios.post(`${API}/admin/reactivate-tag`, { tagId }, authHeaders);
      flash(s.reactivated(tagId), "success");
      fetchTags();
    } catch (err) {
      flash(`❌ ${err.response?.data?.error || err.message}`, "error");
    }
  };

  const filtered = tags.filter((t) => {
    const q = search.toLowerCase();
    return t.tagId.toLowerCase().includes(q) || (t.phone && t.phone.toLowerCase().includes(q));
  });

  return (
    <div className="ap-panel-wrapper">
      <div className="ap-panel">
        <div className="ap-header">
          <h1 className="ap-header-title">{s.title}</h1>
          <span className="ap-header-count">{tags.length} {s.tagsTotal}</span>
        </div>

        {msg && <div className={`ap-flash ${msg.type}`}>{msg.text}</div>}

        <div className="ap-section">
          <h3 className="ap-section-title">{s.createTitle}</h3>
          <div className="ap-row">
            <input
              className="ap-input" placeholder={s.tagIdPlaceholder}
              value={newTagId} onChange={(e) => setNewTagId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTag()}
            />
            <button className="ap-btn-primary" onClick={createTag}>{s.createBtn}</button>
          </div>
        </div>

        <div className="ap-section">
          <div className="ap-row" style={{ justifyContent: "space-between" }}>
            <h3 className="ap-section-title">{s.allTagsTitle}</h3>
          </div>
          <input
            className="ap-input" placeholder={s.searchPlaceholder}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="ap-table-wrapper">
          {loading ? (
            <p className="ap-empty-txt">{s.loadingTags}</p>
          ) : filtered.length === 0 ? (
            <p className="ap-empty-txt">{s.noTagsFound}</p>
          ) : (
            <table className="ap-table">
              <thead>
                <tr>
                  <th className="ap-th">
                    <button className="ap-refresh-btn" onClick={fetchTags} title="Refresh">↻</button>
                  </th>
                  {[cols.tagId, cols.status, cols.phone, cols.owner, cols.setup, cols.actions].map((h) => (
                    <th key={h} className="ap-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tag) => (
                  <tr key={tag.tagId} className="ap-tr">
                    <td className="ap-td">
                      <button className="ap-btn-del" onClick={() => deleteTag(tag.tagId)}>x</button>
                    </td>
                    <td className="ap-td"><code className="ap-code">{tag.tagId}</code></td>
                    <td className="ap-td"><Badge tag={tag} /></td>
                    <td className="ap-td"><span className="ap-subtle">{tag.phone || "—"}</span></td>
                    <td className="ap-td"><span className="ap-subtle">{tag.ownerId ? "Yes" : "—"}</span></td>
                    <td className="ap-td"><span className="ap-subtle">{tag.isSetup ? "✓" : "—"}</span></td>
                    <td className="ap-td">
                      {tag.isActive ? (
                        <button className="ap-btn-danger" onClick={() => deactivateTag(tag.tagId)}>{s.deactivateBtn}</button>
                      ) : (
                        <button className="ap-btn-success" onClick={() => reactivateTag(tag.tagId)}>{s.reactivateBtn}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminPanel() {
  const [secret, setSecret] = useState(null);
  if (!secret) return <LoginScreen onLogin={(s) => setSecret(s)} />;
  return <Panel secret={secret} />;
}

export default AdminPanel;