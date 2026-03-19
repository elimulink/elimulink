import React, { useEffect, useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { completeAdminActivation, redeemAdminKey } from "../lib/adminActivationApi";
import "../styles/institution-auth.css";

export default function StaffEntry() {
  const [accessKey, setAccessKey] = useState("");
  const [activationToken, setActivationToken] = useState("");
  const [activationData, setActivationData] = useState(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const root = document.getElementById("root");
    document.documentElement.classList.add("login-viewport-lock");
    document.body.classList.add("login-viewport-lock");
    root?.classList.add("login-viewport-lock");
    return () => {
      document.documentElement.classList.remove("login-viewport-lock");
      document.body.classList.remove("login-viewport-lock");
      root?.classList.remove("login-viewport-lock");
    };
  }, []);

  const canRedeem = !pending && accessKey.trim().length > 0 && !activationToken;
  const canComplete = !pending && Boolean(activationToken) && String(password).length >= 8 && password === confirmPassword;

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const data = await redeemAdminKey(accessKey.trim());
      setActivationToken(String(data?.activationToken || ""));
      setActivationData(data?.activation || null);
      setFullName(String(data?.activation?.fullName || ""));
    } catch (err) {
      setError(String(err?.message || "Failed to redeem activation key"));
    } finally {
      setPending(false);
    }
  }

  async function handleComplete(event) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    setSuccess("");
    try {
      await completeAdminActivation({
        activationToken,
        password,
        fullName: fullName.trim(),
      });
      setSuccess("Activation complete. Continue to normal login with your email and password.");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        window.location.replace("/login?returnTo=%2Finstitution");
      }, 600);
    } catch (err) {
      setError(String(err?.message || "Failed to complete activation"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="staff-entry-page">
      <section className="staff-entry-shell">
        <div className="staff-entry-card">
          <div className="staff-entry-header">
            <div className="staff-entry-logo">EL</div>
            <div>
              <div className="staff-entry-eyebrow">STAFF ACCESS</div>
              <h1>{activationToken ? "Complete staff entry" : "Staff entry"}</h1>
              <p>Continue with secure institutional access for staff, department leads, and administrators.</p>
            </div>
          </div>

          <div className="staff-entry-info">
            <div className="staff-entry-info-item">
              <ShieldCheck className="staff-entry-info-icon" />
              <span>Protected institutional workspace access</span>
            </div>
            <div className="staff-entry-info-item">
              <KeyRound className="staff-entry-info-icon" />
              <span>Supports activation keys and role-based entry</span>
            </div>
          </div>

          {error ? <div className="inst-auth-error inst-auth-error-dark">{error}</div> : null}
          {success ? <div className="inst-auth-notice inst-auth-notice-dark">{success}</div> : null}

          {!activationToken ? (
            <form className="staff-entry-form" onSubmit={handleSubmit}>
              <label className="inst-auth-field">
                <span>Access key</span>
                <input type="text" placeholder="Enter activation or invite key" value={accessKey} onChange={(e) => setAccessKey(e.target.value.toUpperCase())} required />
              </label>

              <button className="inst-auth-primary staff-entry-primary" type="submit" disabled={!canRedeem}>
                <span>{pending ? "Validating key..." : "Continue to workspace"}</span>
                {!pending ? <ArrowRight size={16} /> : null}
              </button>
            </form>
          ) : (
            <>
              <div className="staff-entry-activation-summary">
                <div><strong>Institution:</strong> {activationData?.institutionName || activationData?.institutionId || "N/A"}</div>
                <div><strong>Department:</strong> {activationData?.departmentName || activationData?.departmentId || "N/A"}</div>
                <div><strong>Role:</strong> {activationData?.role || "staff"}</div>
                <div><strong>Email:</strong> {activationData?.email || "N/A"}</div>
              </div>

              <form className="staff-entry-form" onSubmit={handleComplete}>
                <label className="inst-auth-field">
                  <span>Full name</span>
                  <input type="text" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>

                <label className="inst-auth-field">
                  <span>Password</span>
                  <input type="password" placeholder="Enter password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                </label>

                <label className="inst-auth-field">
                  <span>Confirm password</span>
                  <input type="password" placeholder="Re-enter password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
                </label>

                <button className="inst-auth-primary staff-entry-primary" type="submit" disabled={!canComplete}>
                  <span>{pending ? "Completing..." : "Complete activation"}</span>
                  {!pending ? <ArrowRight size={16} /> : null}
                </button>
              </form>
            </>
          )}

          <div className="inst-auth-links">
            <button type="button" className="inst-auth-link-button inst-auth-link-button-dark" onClick={() => window.location.replace("/login?returnTo=%2Finstitution")}>
              Back to login
            </button>
            <button type="button" className="inst-auth-link-button inst-auth-link-button-dark" onClick={() => window.location.replace("/login?returnTo=%2Finstitution")}>
              Institution sign-in
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
