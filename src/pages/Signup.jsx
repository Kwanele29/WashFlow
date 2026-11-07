import React, { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, UserPlus, Car } from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { Link, useNavigate } from "react-router-dom"; 
import "./SignUp.css";

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
            role: values.role 
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
          
          <div className="su-field-wrap">
             <label className="su-field" style={{ padding: '0 15px' }}>
                <select 
                  name="role" 
                  value={values.role} 
                  onChange={handleChange}
                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', color: 'inherit', padding: '15px 0' }}
                >
                  <option value="customer">I am a Customer</option>
                  <option value="employee">I am an Employee</option>
                  <option value="owner">I am the Owner</option>
                </select>
             </label>
          </div>

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