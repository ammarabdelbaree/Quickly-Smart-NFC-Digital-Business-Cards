import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../style/ResetPassword.css";

function getStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[^a-zA-Z0-9]/.test(pw) || /[0-9]/.test(pw)) score++;
  return score; // 0–3
}

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  const strength = getStrength(password);
  const strengthKey = ["", "weak", "medium", "strong"][strength];
  const segClass = (i) =>
    i >= strength
      ? "reset-strength-seg"
      : `reset-strength-seg active-${strengthKey}`;

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionReady(true);
      } else {
        setError("Invalid or expired reset link.");
      }
    };
    getSession();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage("Password successfully updated. You can now login.");
    setPassword("");
    setConfirm("");
    setLoading(false);
  };

  return (
    <div className="reset-page-wrap">
      <div className="reset-card">

        <div className="reset-icon-badge">🔑</div>

        <header className="reset-auth-header">
          <h2>Reset Password</h2>
          <p className="reset-subtitle">Enter your new password below</p>
        </header>

        {error && (
          <div className="reset-error-banner">
            <span>⚠</span> {error}
          </div>
        )}
        {message && (
          <div className="reset-success-banner">
            <span>✓</span> {message}
          </div>
        )}

        {sessionReady && !message && (
          <form onSubmit={handleReset} className="reset-form">

            <div className="reset-form-group">
              <label>New Password</label>
              <div className="reset-password-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  className="reset-pass-input"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="reset-toggle-btn"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="reset-strength-bar" aria-hidden="true">
                  <div className={segClass(1)} />
                  <div className={segClass(2)} />
                  <div className={segClass(3)} />
                </div>
              )}
            </div>

            <div className="reset-form-group">
              <label>Confirm Password</label>
              <input
                type={showPass ? "text" : "password"}
                className="reset-confirm-input"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button
              className="reset-submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? "Updating…" : "Update Password"}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}

export default ResetPassword;