// AdminLoginPage.jsx
import React, { useState } from "react";
import { supabase } from "./supabase";
import { useTranslation } from "../LanguageContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function AdminLoginPage({ onLoginSuccess, onBack }) {
  const { t } = useTranslation();
  const s = t.adminLogin;

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Forgot-password mode
  const [forgotMode,    setForgotMode]    = useState(false);
  const [forgotEmail,   setForgotEmail]   = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg,     setForgotMsg]     = useState("");
  const [forgotError,   setForgotError]   = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setErrorMsg(s.errors.emptyFields); return; }
    setLoading(true); setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
      if (error) {
        if (error.message.includes("Email not confirmed")) setErrorMsg(s.errors.emailNotConfirmed);
        else if (error.message.includes("Invalid login") || error.message.includes("invalid_credentials")) setErrorMsg(s.errors.invalidCredential);
        else setErrorMsg(s.errors.generic);
        return;
      }
      onLoginSuccess();
    } catch { setErrorMsg(s.errors.generic); }
    finally  { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) { setForgotError(s.errors.invalidEmail); return; }
    setForgotLoading(true); setForgotError(""); setForgotMsg("");
    try {
      // Always sends the reset email to the supplied address — Supabase handles
      // matching it to an account silently (no user-enumeration leak).
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setForgotError(s.errors.resetFailed); return; }
      setForgotMsg(s.resetEmailSent);
      setForgotEmail("");
    } catch { setForgotError(s.errors.resetFailed); }
    finally  { setForgotLoading(false); }
  };

  return (
    <div className="page admin-login-page animate-fade-in">
      <nav className="setup-nav">
        <button onClick={onBack} className="logout-btn">
          {t.common.returnToProfile}
        </button>
      </nav>

      {!forgotMode ? (
        <>
          <div className="login-header">
            <h2>{s.title}</h2>
            <p>{s.subtitle}</p>
          </div>
          <div className="login-container">
            {errorMsg && <div className="error-banner">{errorMsg}</div>}
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>{s.emailLabel}</label>
                <input type="email" placeholder={s.emailPlaceholder}
                  value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
              </div>
              <div className="form-group">
                <label>{s.passwordLabel}</label>
                <div className="password-wrapper">
                  <input className="pass-input" type={showPass ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required />
                  <button type="button" className="toggle-password" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn primary-btn" disabled={loading}>
                {loading ? t.common.verifying : s.signIn}
              </button>
            </form>
            <div className="login-footer">
              <button className="text-btn" onClick={() => { setForgotMode(true); setErrorMsg(""); }}>
                {s.forgotPassword}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="login-header">
            <h2>{s.forgotTitle || "Reset Password"}</h2>
            <p>{s.forgotHint}</p>
          </div>
          <div className="login-container">
            {forgotMsg ? (
              <div className="success-banner">{forgotMsg}</div>
            ) : (
              <form onSubmit={handleForgotPassword} className="login-form">
                {forgotError && <div className="error-banner">{forgotError}</div>}
                <div className="form-group">
                  <label>{s.emailLabel}</label>
                  <input type="email" placeholder={s.emailPlaceholder}
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus required />
                </div>
                <button type="submit" className="btn primary-btn" disabled={forgotLoading}>
                  {forgotLoading ? t.common.processing : s.sendResetEmail}
                </button>
              </form>
            )}
            <div className="login-footer">
              <button className="text-btn" onClick={() => { setForgotMode(false); setForgotMsg(""); setForgotError(""); }}>
                {s.backToLogin || "← Back to login"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminLoginPage;