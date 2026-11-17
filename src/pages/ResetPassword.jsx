import React, { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

// Opened from the link in the "reset your password" email (route: /update-password).
// Also used by new employees to set their FIRST password.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | ready | invalid | done
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    // the email link can come back with an error (expired / already used)
    if (/error=|error_code=|error_description=/.test(window.location.hash + window.location.search)) {
      setStatus("invalid");
      return undefined;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setStatus("ready");
    });

    // Supabase reads the link's token by itself; if nothing happened after a moment, the link is no good
    const timer = setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      if (alive) setStatus((cur) => (cur === "checking" ? (s.session ? "ready" : "invalid") : cur));
    }, 1500);

    return () => {
      alive = false;
      clearTimeout(timer);
      data?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setStatus("done");

      // send them to the right dashboard for their role
      const { data: u } = await supabase.auth.getUser();
      let role = null;
      if (u?.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.user.id).single();
        role = profile?.role;
      }
      setTimeout(() => {
        navigate(role === "owner" ? "/admin" : role === "employee" ? "/employee" : "/dashboard");
      }, 1500);
    } catch (err) {
      setError(err?.message || "Could not set your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <div className="login__overlay" />

      <section className="login__brand">
        <img src="/assets/logo.png" alt="WashFlow – Queue, Track, Relax" className="login__logo" />
        <div className="login__welcome">
          <h1>Set your <span>Password</span></h1>
          <p>Choose a new password you will remember.</p>
          <span className="login__rule" />
        </div>
      </section>

      <section className="login__card" aria-labelledby="reset-title">
        <div className="login__avatar">
          <UserRound size={44} strokeWidth={2} />
        </div>

        {status === "checking" && (
          <>
            <h2 id="reset-title">One moment...</h2>
            <p className="login__subtitle">Checking your link</p>
          </>
        )}

        {status === "invalid" && (
          <>
            <h2 id="reset-title">Link expired</h2>
            <p className="login__subtitle">This link is no longer valid. Request a new one from the login page (Forgot Password?).</p>
            <Link to="/login" className="btn btn--primary" style={{ marginTop: "20px", textDecoration: "none", display: "flex", justifyContent: "center" }}>
              Back to Login <ArrowRight size={20} />
            </Link>
          </>
        )}

        {status === "done" && (
          <>
            <h2 id="reset-title">Password saved</h2>
            <p className="login__subtitle" style={{ color: "#4ade80" }}>Taking you to your dashboard...</p>
          </>
        )}

        {status === "ready" && (
          <>
            <h2 id="reset-title">New Password</h2>
            <p className="login__subtitle">Enter and confirm your new password</p>

            <form className="login__form" onSubmit={handleSubmit} noValidate>
              <label className="field">
                <Lock size={22} className="field__icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password (8+ characters)"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="field__toggle" onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? <Eye size={22} /> : <EyeOff size={22} />}
                </button>
              </label>

              <label className="field">
                <Lock size={22} className="field__icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>

              {error && <p className="login__error" role="alert">{error}</p>}

              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? "Saving..." : <>Save Password <ArrowRight size={20} /></>}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}