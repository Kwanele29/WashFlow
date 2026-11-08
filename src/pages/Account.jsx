import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, Shield, LogOut } from "lucide-react";
import "./Account.css";

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
      }
    }
    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) return <div style={{ padding: '50px', color: 'white', background: '#071428', minHeight: '100vh' }}>Loading...</div>;

  return (
    <div className="account-page">
      <div className="account-container">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        
        <h1 className="account-title">My Account</h1>

        <div className="account-card">
          <div className="account-header">
            <div className="account-avatar">
              <User size={40} />
            </div>
            <div>
              <h2 className="account-name">{profile?.full_name || "User"}</h2>
              <span className="account-role">{profile?.role || "Customer"}</span>
            </div>
          </div>

          <div className="account-details">
            <div className="account-detail-row">
              <Mail size={24} color="#a0b3d6" />
              <div>
                <p className="account-detail-label">Email Address</p>
                <p className="account-detail-value">{user.email}</p>
              </div>
            </div>
            <div className="account-detail-row">
              <Shield size={24} color="#a0b3d6" />
              <div>
                <p className="account-detail-label">Account Role</p>
                <p className="account-detail-value">{profile?.role || "Customer"}</p>
              </div>
            </div>
          </div>

          <button className="account-logout-btn" onClick={handleLogout}>
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}