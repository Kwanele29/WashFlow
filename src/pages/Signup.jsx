import React, { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, UserPlus, Car } from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { Link, useNavigate } from "react-router-dom"; 
import "./Signup.css"; 

const INITIAL = {
  fullName: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "customer" 
};

function validate(values) {
  const errors = {};
  if (!values.fullName.trim()) errors.fullName = "Full name is required.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!/^[+\d][\d\s-]{7,}$/.test(values.phone)) errors.phone = "Enter a valid phone number.";
  if (values.username.trim().length < 3) errors.username = "Username must be at least 3 characters.";
  if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (values.confirmPassword !== values.password) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export default function SignUp() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      setLoading(true);
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: data.user.id, 
            full_name: values.fullName, 
            role: "customer" // SECURITY: Force role to be customer
          }]);

        if (profileError) throw profileError;
      }
      
      alert("Account created successfully! Please log in.");
      navigate('/login'); 
      
    } catch (err) {
      setServerError(err?.message || "Could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ADDED: Google Signup Logic
  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard' 
        }
      });
      if (error) throw error;
    } catch (err) {
      setServerError(err?.message || "Google signup failed.");
    }
  };

  const renderField = ({ name, type = "text", placeholder, icon: Icon, autoComplete }) => (
    <div className="su-field-wrap" key={name}>
      <label className={`su-field ${errors[name] ? "has-error" : ""}`}>
        <Icon size={22} className="su-field__icon" />
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={handleChange}
        />
      </label>
      {errors[name] && <span className="su-error">{errors[name]}</span>}
    </div>
  );

  const renderPassword = ({ name, placeholder, show, setShow, autoComplete }) => (
    <div className="su-field-wrap" key={name}>
      <label className={`su-field ${errors[name] ? "has-error" : ""}`}>
        <Lock size={22} className="su-field__icon" />
        <input
          type={show ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={handleChange}
        />
        <button
          type="button"
          className="su-field__toggle"
          onClick={() => setShow((s) => !s)}
        >
          {show ? <Eye size={22} /> : <EyeOff size={22} />}
        </button>
      </label>
      {errors[name] && <span className="su-error">{errors[name]}</span>}
    </div>
  );

  return (
    <main className="signup">
      <div className="signup__overlay" />

      <section className="signup__brand">
        <img src="/assets/logo.png" alt="WashFlow" className="signup__logo" />
        <div className="signup__welcome">
          <h1>Join <span>WashFlow</span></h1>
          <p>Create your account to join the queue in seconds,<br />track your turn live and skip the wait.</p>
          <span className="signup__rule" />
        </div>
      </section>

      <section className="signup__card" aria-labelledby="signup-title">
        <div className="signup__avatar">
          <UserPlus size={42} strokeWidth={2} />
        </div>
        <h2 id="signup-title">Sign Up</h2>
        <p className="signup__subtitle">Create your account</p>

        <form className="signup__form" onSubmit={handleSubmit} noValidate>
          
          {renderField({ name: "fullName", placeholder: "Full Name", icon: User, autoComplete: "name" })}
          {renderField({ name: "email", type: "email", placeholder: "Email Address", icon: Mail, autoComplete: "email" })}

          <div className="signup__row">
            {renderField({ name: "phone", type: "tel", placeholder: "Phone Number", icon: Phone, autoComplete: "tel" })}
            {renderField({ name: "username", placeholder: "Username", icon: User, autoComplete: "username" })}
          </div>

          {renderPassword({ name: "password", placeholder: "Password", show: showPassword, setShow: setShowPassword, autoComplete: "new-password" })}
          {renderPassword({ name: "confirmPassword", placeholder: "Confirm Password", show: showConfirm, setShow: setShowConfirm, autoComplete: "new-password" })}

          {serverError && <p className="su-server-error" role="alert">{serverError}</p>}

          <button type="submit" className="su-btn su-btn--primary" disabled={loading}>
            {loading ? "Creating account..." : <>Create Account <ArrowRight size={20} /></>}
          </button>

          <div className="signup__divider"><span>or</span></div>

          {/* ADDED: Google Signup Button */}
          <button 
            type="button" 
            className="su-btn su-btn--ghost" 
            onClick={handleGoogleSignup}
            style={{ backgroundColor: 'white', color: '#333', border: 'none' }}
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.86 16.79 15.69 17.57V20.34H19.26C21.35 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.26 20.34L15.69 17.57C14.71 18.23 13.46 18.63 12 18.63C9.16 18.63 6.75 16.71 5.88 14.15H2.21V16.99C4.01 20.56 7.72 23 12 23Z" fill="#34A853"/>
              <path d="M5.88 14.15C5.66 13.49 5.54 12.77 5.54 12C5.54 11.23 5.66 10.51 5.88 9.85V7.01H2.21C1.47 8.49 1 10.19 1 12C1 13.81 1.47 15.51 2.21 16.99L5.88 14.15Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.03L19.34 3.89C17.45 2.13 14.97 1 12 1C7.72 1 4.01 3.44 2.21 7.01L5.88 9.85C6.75 7.29 9.16 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <Link to="/login" className="su-btn su-btn--ghost">
            <Car size={26} /> I already have an account
          </Link>
        </form>

        <p className="signup__footer">
          Already registered? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}