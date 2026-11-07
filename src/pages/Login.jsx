import React, { useState } from "react";
import { User, Lock, Eye, EyeOff, ArrowRight, Car, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { Link, useNavigate } from "react-router-dom"; 
import "./Login.css";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.identifier.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.identifier,
        password: form.password,
      });

      if (signInError) throw signInError;
      navigate('/queue'); 
    } catch (err) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ADDED: Google Login Logic
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/queue' // Redirects to queue after login
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err?.message || "Google login failed.");
    }
  };

  return (
    <main className="login">
      <div className="login__overlay" />

      <section className="login__brand">
        <img src="/assets/logo.png" alt="WashFlow – Queue, Track, Relax" className="login__logo" />
        <div className="login__welcome">
          <h1>Welcome <span>Back!</span></h1>
          <p>Log in to manage queues, track your position<br />and enjoy a hassle-free car wash experience.</p>
          <span className="login__rule" />
        </div>
      </section>

      <section className="login__card" aria-labelledby="login-title">
        <div className="login__avatar">
          <UserRound size={44} strokeWidth={2} />
        </div>
        <h2 id="login-title">Login</h2>
        <p className="login__subtitle">Access your account</p>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <User size={22} className="field__icon" />
            <input
              type="email"
              name="identifier"
              placeholder="Email Address"
              autoComplete="username"
              value={form.identifier}
              onChange={handleChange}
            />
          </label>

          <label className="field">
            <Lock size={22} className="field__icon" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="field__toggle"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
          </label>

          {error && <p className="login__error" role="alert">{error}</p>}

          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Logging in..." : <>Login <ArrowRight size={20} /></>}
          </button>

          <div className="login__divider"><span>or</span></div>

          {/* ADDED: Google Login Button */}
          <button type="button" className="btn btn--ghost" onClick={handleGoogleLogin} style={{ backgroundColor: 'white', color: '#333', border: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.86 16.79 15.69 17.57V20.34H19.26C21.35 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.26 20.34L15.69 17.57C14.71 18.23 13.46 18.63 12 18.63C9.16 18.63 6.75 16.71 5.88 14.15H2.21V16.99C4.01 20.56 7.72 23 12 23Z" fill="#34A853"/>
              <path d="M5.88 14.15C5.66 13.49 5.54 12.77 5.54 12C5.54 11.23 5.66 10.51 5.88 9.85V7.01H2.21C1.47 8.49 1 10.19 1 12C1 13.81 1.47 15.51 2.21 16.99L5.88 14.15Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.03L19.34 3.89C17.45 2.13 14.97 1 12 1C7.72 1 4.01 3.44 2.21 7.01L5.88 9.85C6.75 7.29 9.16 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button type="button" className="btn btn--ghost" onClick={() => navigate('/queue')}>
            <Car size={26} /> Continue as Guest
          </button>
        </form>

        <p className="login__footer">
          Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </section>
    </main>
  );
}