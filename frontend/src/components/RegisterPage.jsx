import React, { useState } from "react";
import axios from "axios";
import { supabase } from "./supabase";
import { useTranslation } from "../LanguageContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function RegisterPage({ tagId, onAdminCreated }) {
  const { t } = useTranslation();
  const s = t.register;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isNew, setIsNew] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [resetMsg, setResetMsg] = useState("");

  const validate = () => {
    if (!email.includes("@")) return s.errors.invalidEmail;
    if (password.length < 6) return s.errors.shortPassword;
    if (!code.trim()) return s.errors.noCode;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    if (err) {
      setErrorMsg(err);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/claim-tag`, {
        tagId,
        code: code.trim().toUpperCase(),
        email: email.toLowerCase(),
        password,
        isExistingUser: !isNew,
      });

      // Claim succeeded — now try to sign in automatically.
      // If sign-in fails for any reason, the tag is already claimed so we
      // still proceed. The user will be prompted to sign in on next load.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (signInErr) {
        // Auto sign-in failed but claim was successful — proceed normally.
        onAdminCreated();
        return;
      }

      onAdminCreated();
    } catch (err) {
      // Only errors thrown by /claim-tag itself land here.
      const msg = err.response?.data?.error;

      const map = {
        INVALID_CREDENTIALS: s.errors.generic,
        INVALID_CODE: s.errors.invalidCode,
        EMAIL_IN_USE: s.errors.emailInUse,
        TAG_ALREADY_CLAIMED: s.errors.tagClaimed,
        USER_NOT_FOUND: s.errors.generic,
      };

      if (msg === "EMAIL_IN_USE") {
        setIsNew(false);
      }

      setErrorMsg(map[msg] || msg || s.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page animate-fade-in">
      <div className="auth-card">
        <header className="auth-header">
          <h1>{isNew ? s.titleNew : s.titleExisting}</h1>
          <p className="auth-subtitle">
            {isNew ? s.subtitleNew : s.subtitleExisting}
          </p>
        </header>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}
        {resetMsg && <div className="success-banner">{resetMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group highlight">
            <label>{s.codeLabel}</label>
            <input
              type="text"
              placeholder={s.codePlaceholder}
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{s.emailLabel}</label>
            <input
              type="email"
              placeholder={s.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{s.passwordLabel}</label>

            <div className="password-wrapper">
              <input
                className="pass-input"
                type={showPass ? "text" : "password"}
                placeholder={
                  isNew
                    ? s.passwordPlaceholderNew
                    : s.passwordPlaceholderExisting
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
          </div>

          <button
            className="btn primary-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? t.common.processing
              : isNew
              ? s.submitNew
              : s.submitExisting}
          </button>
        </form>

        <div className="auth-footer">
          <button
            className="text-btn"
            onClick={() => {
              setIsNew((v) => !v);
              setErrorMsg("");
              setResetMsg("");
            }}
          >
            {isNew ? s.switchToLogin : s.switchToRegister}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;