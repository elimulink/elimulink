import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { completeAdminActivation, redeemAdminKey } from "../lib/adminActivationApi";
import { apiUrl } from "../lib/apiUrl";
import { auth } from "../lib/firebase";
import "../styles/institution-auth.css";

export default function StaffEntry() {
  const [view, setView] = useState("activate");
  const [accessKey, setAccessKey] = useState("");
  const [activationToken, setActivationToken] = useState("");
  const [activationData, setActivationData] = useState(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [departmentKey, setDepartmentKey] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
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

  const loginEmail = useMemo(() => {
    const candidate = String(staffUsername || "").trim();
    if (!candidate) return String(staffEmail || activationData?.email || "").trim();
    if (candidate.includes("@")) return candidate;
    return String(staffEmail || activationData?.email || "").trim();
  }, [activationData?.email, staffEmail, staffUsername]);

  const canRedeem = !pending && accessKey.trim().length > 0 && !activationToken;
  const canComplete = !pending && Boolean(activationToken) && String(password).length >= 8 && password === confirmPassword;
  const canLogin = !pending && String(staffPassword).length >= 8 && String(staffUsername).trim().length > 0 && String(departmentKey).trim().length > 0;
  const isLocalDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local"));

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
      setStaffEmail(String(data?.activation?.email || ""));
      setStaffUsername(String(data?.activation?.fullName || data?.activation?.email || ""));
      setDepartmentKey(String(data?.activation?.departmentName || data?.activation?.departmentId || ""));
      setView("activate");
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
      setSuccess("Activation complete. Use the staff login form below to continue.");
      setStaffEmail(String(activationData?.email || staffEmail || "").trim());
      setStaffUsername(fullName.trim());
      setStaffPassword(password);
      setDepartmentKey(String(activationData?.departmentName || activationData?.departmentId || "").trim());
      setConfirmPassword("");
      setView("login");
    } catch (err) {
      setError(String(err?.message || "Failed to complete activation"));
    } finally {
      setPending(false);
    }
  }

  async function handleStaffLogin(event) {
    event.preventDefault();
    const usernameValue = String(staffUsername || "").trim();
    const passwordValue = String(staffPassword || "").trim();
    const departmentValue = String(departmentKey || "").trim();
    if (!usernameValue) {
      setError("Enter your username.");
      return;
    }
    if (!passwordValue || passwordValue.length < 8) {
      setError("Enter your password.");
      return;
    }
    if (!departmentValue) {
      setError("Enter your department key.");
      return;
    }

    setPending(true);
    setError("");
    setSuccess("");
    try {
      const emailToUse = loginEmail || (usernameValue.includes("@") ? usernameValue : "");
      if (!emailToUse) {
        throw new Error("We need the activation email to sign you in. Please complete activation first.");
      }

      const credential = await signInWithEmailAndPassword(auth, emailToUse, passwordValue);
      const token = await credential.user.getIdToken();
      const response = await fetch(apiUrl("/api/auth/verify-staff-code"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ staffCode: departmentValue }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to verify department key");

      window.history.pushState({ institutionMode: "admin" }, "", "/institution");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      setError(String(err?.message || "Failed to sign in"));
    } finally {
      setPending(false);
    }
  }

  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");
    try {
      const emailToUse = loginEmail || String(staffUsername || "").trim();
      if (!emailToUse || !emailToUse.includes("@")) {
        throw new Error("Enter the activation email or complete activation first.");
      }
      await sendPasswordResetEmail(auth, emailToUse);
      setSuccess("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(String(err?.message || "Failed to send reset email"));
    }
  };

  return (
    <div className="staff-entry-page">
      <section className="staff-entry-shell">
        <div className="staff-entry-card">
          {isLocalDevHost ? (
            <div className="inst-auth-notice inst-auth-notice-dark" style={{ marginBottom: 16 }}>
              Local developer bypass is active. Continue to enter the Institution workspace directly.
            </div>
          ) : null}
          <div className="staff-entry-header">
            <img src="/favicon.png" alt="ElimuLink" className="staff-entry-logo" />
            <div>
              <div className="staff-entry-eyebrow">STAFF ACCESS</div>
              <h1>{view === "login" ? "Staff login" : activationToken ? "Complete staff entry" : "Staff entry"}</h1>
              <p>
                {view === "login"
                  ? "Use your username, password, and department key to enter the admin workspace."
                  : "Continue with secure institutional access for staff, department leads, and administrators."}
              </p>
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
          ) : view === "activate" ? (
            <>
              <div className="staff-entry-activation-summary">
                <div><strong>Institution:</strong> {activationData?.institutionName || activationData?.institutionId || "N/A"}</div>
                <div><strong>Department:</strong> {activationData?.departmentName || activationData?.departmentId || "N/A"}</div>
                <div><strong>Role:</strong> {activationData?.role || "staff"}</div>
                <div><strong>Email:</strong> {activationData?.email || "N/A"}</div>
              </div>

              <form className="staff-entry-form" onSubmit={handleComplete}>
                <label className="inst-auth-field">
                  <span>Username</span>
                  <input type="text" placeholder="Choose your username" value={fullName} onChange={(e) => setFullName(e.target.value)} />
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
          ) : (
            <>
              <div className="staff-entry-activation-summary">
                <div><strong>Institution:</strong> {activationData?.institutionName || activationData?.institutionId || "N/A"}</div>
                <div><strong>Department:</strong> {activationData?.departmentName || activationData?.departmentId || "N/A"}</div>
                <div><strong>Role:</strong> {activationData?.role || "staff"}</div>
                <div><strong>Activation email:</strong> {activationData?.email || staffEmail || "N/A"}</div>
              </div>

              <form className="staff-entry-form" onSubmit={handleStaffLogin}>
                <label className="inst-auth-field">
                  <span>Username</span>
                  <input type="text" placeholder="Enter your username" value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} required />
                </label>

                <label className="inst-auth-field">
                  <span>Password</span>
                  <input type="password" placeholder="Enter your password" autoComplete="current-password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} minLength={8} required />
                </label>

                <label className="inst-auth-field">
                  <span>Department key</span>
                  <input type="text" placeholder="Enter department key" value={departmentKey} onChange={(e) => setDepartmentKey(e.target.value.toUpperCase())} required />
                </label>

                <button className="inst-auth-primary staff-entry-primary" type="submit" disabled={!canLogin}>
                  <span>{pending ? "Checking access..." : "Continue to workspace"}</span>
                  {!pending ? <ArrowRight size={16} /> : null}
                </button>
              </form>
            </>
          )}

          <div className="inst-auth-links">
            <button
              type="button"
              className="inst-auth-link-button inst-auth-link-button-dark"
              onClick={() => setView((prev) => (prev === "login" ? "activate" : "login"))}
            >
              {view === "login" ? "Back to activation" : "Staff login"}
            </button>
            <button
              type="button"
              className="inst-auth-link-button inst-auth-link-button-dark"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <div className="inst-auth-sub-actions">
            <button
              type="button"
              className="inst-auth-secondary-link inst-auth-link-button-dark"
              onClick={() => setView("activate")}
            >
              Activation of account / department
            </button>
            <button
              type="button"
              className="inst-auth-secondary-link inst-auth-link-button-dark"
              onClick={() => window.location.replace("/login?returnTo=%2Finstitution%2F")}
            >
              Main login
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
