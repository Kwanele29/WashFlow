import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const money = (n) => `R${Number(n || 0).toLocaleString("en-ZA")}`;

const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {[].concat(d).map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  tag: ["M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z", "M7.5 7.5h.01"],
  history: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5", "M12 7v5l3 2"],
  users: ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"],
  hourglass: ["M6 2h12", "M6 22h12", "M7 2v4a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v4", "M17 2v4a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v4"],
  car: ["M5 17h14M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6v4h-2v2h-3v-2H8v2H5v-2H3z", "M7 14h.01M17 14h.01"],
  check: ["M22 11.1V12a10 10 0 1 1-5.9-9.1", "M22 4L12 14l-3-3"],
  cash: ["M2 6h20v12H2z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  plus: "M12 5v14M5 12h14",
};
const I = ({ n, size }) => <Icon d={ICONS[n]} size={size} />;

function StatCard({ icon, value, label }) {
  return (
    <div className="wf-card wf-stat">
      <div className="wf-stat-icon"><I n={icon} size={44} /></div>
      <div>
        <div className="wf-stat-value">{value}</div>
        <div className="wf-stat-label">{label}</div>
      </div>
    </div>
  );
}

const STATUS_CLASS = { completed: "ok", washing: "blue", waiting: "warn" };
const StatusPill = ({ s }) => <span className={`wf-pill ${STATUS_CLASS[s] || "muted"}`}><i />{s}</span>;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [jobs, setJobs] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: jobsData, error: jobsError } = await supabase
      .from('queue_tickets')
      .select('*, services(name, price), profiles!customer_id(full_name)');
    
    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
    } else if (jobsData) {
      const formattedJobs = jobsData.map(j => {
        const d = new Date(j.created_at);
        return {
          id: j.id,
          time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          queueNo: j.id,
          customer: j.profiles?.full_name || 'Unknown',
          serviceId: j.service_id,
          service: j.services?.name || 'Wash',
          price: j.services?.price || 0,
          status: j.status, 
          employeeId: j.assigned_employee
        };
      });
      setJobs(formattedJobs);
    }

    const { data: srvData } = await supabase.from('services').select('*');
    if (srvData) setServices(srvData);

    const { data: empData } = await supabase.from('profiles').select('*').eq('role', 'employee');
    if (empData) setEmployees(empData.map(e => ({ ...e, name: e.full_name })));

    setLoading(false);
  }

  const handleUpdatePrice = async (id) => {
    if (!editPrice) return;
    const { error } = await supabase.from('services').update({ price: parseFloat(editPrice) }).eq('id', id);
    if (!error) {
      alert("Price updated successfully!");
      setEditingServiceId(null);
      setEditPrice("");
      fetchData();
    }
  };

  const completedJobs = jobs.filter(j => j.status === 'completed');
  const revenue = completedJobs.reduce((a, j) => a + j.price, 0);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="wf-root" style={{ padding: '50px', color: 'white' }}>Loading Dashboard...</div>;

  return (
    <div className="wf-root">
      
      <aside className="wf-side">
        <div className="wf-logo"><span>Wash</span><b>Flow</b><small>Queue • Track • Relax</small></div>
        <nav>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><I n="home" /> <span>Dashboard</span></button>
          <button className={view === "services" ? "active" : ""} onClick={() => setView("services")}><I n="tag" /> <span>Prices &amp; Services</span></button>
          <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}><I n="history" /> <span>Queue History</span></button>
          <button className={view === "staff" ? "active" : ""} onClick={() => setView("staff")}><I n="users" /> <span>Staff Management</span></button>
        </nav>
        <button className="wf-logout" onClick={handleLogout}><I n="logout" /> <span>Logout</span></button>
      </aside>

      <main className="wf-main">
        <header className="wf-head">
          <div>
            <h1>Welcome back, <em>Owner!</em></h1>
            <p>Here's an overview of WashFlow.</p>
          </div>
          <div className="wf-head-right">
            <div className="wf-bell"><I n="bell" size={26} /></div>
            <div className="wf-user"><div className="avatar"><I n="users" size={20} /></div><span>Admin</span></div>
          </div>
        </header>

        {view === "dashboard" && (
          <>
            <div className="wf-grid-2 wf-grid-stats">
              <section className="wf-card wf-big">
                <I n="car" size={48} />
                <h2 className="wf-big-value">{completedJobs.length}</h2>
                <p className="wf-big-label">Cars Washed</p>
              </section>
              <section className="wf-card wf-big">
                <I n="cash" size={48} />
                <h2 className="wf-big-value money">{money(revenue)}</h2>
                <p className="wf-big-label">Money Made</p>
              </section>
            </div>

            <div className="wf-grid-2">
              <section className="wf-card">
                <h3>Recent Queue Activity</h3>
                <table className="wf-table wf-stack">
                  <thead><tr><th>Time</th><th>Queue No.</th><th>Customer</th><th>Service</th><th>Status</th></tr></thead>
                  <tbody>
                    {jobs.length === 0 && <tr className="wf-empty"><td colSpan={5}>No queue activity yet.</td></tr>}
                    {jobs.slice(0, 5).map(j => (
                      <tr key={j.id}><td data-label="Time">{j.time}</td><td data-label="Queue No.">#{j.queueNo}</td><td data-label="Customer">{j.customer}</td><td data-label="Service">{j.service}</td><td data-label="Status"><StatusPill s={j.status} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="wf-card">
                <h3>Staff <span className="wf-sub">cars washed &amp; money made</span></h3>
                <table className="wf-table wf-stack">
                  <thead><tr><th>Employee</th><th>Cars</th><th>Made</th></tr></thead>
                  <tbody>
                    {employees.map(e => {
                      const mine = completedJobs.filter(j => j.employeeId === e.id);
                      return <tr key={e.id}><td data-label="Employee">{e.name}</td><td data-label="Cars">{mine.length}</td><td data-label="Made" className="money">{money(mine.reduce((a, j) => a + j.price, 0))}</td></tr>;
                    })}
                  </tbody>
                </table>
              </section>
            </div>
          </>
        )}

        {view === "services" && (
          <div className="wf-grid-2 wide-left">
            <section className="wf-card">
              <h3>Services &amp; Prices</h3>
              <table className="wf-table wf-stack">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Current Price</th>
                    <th>Edit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td data-label="Service">{s.name}</td>
                      <td data-label="Current Price" className="money">{money(s.price)}</td>
                      <td data-label="Edit Price">
                        {editingServiceId === s.id ? (
                          <div className="wf-inline">
                            <input type="number" className="wf-input sm" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                            <button className="wf-btn sm" onClick={() => handleUpdatePrice(s.id)}>Save</button>
                            <button className="wf-btn ghost sm" onClick={() => setEditingServiceId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className="wf-btn ghost sm" onClick={() => { setEditingServiceId(s.id); setEditPrice(s.price); }}>Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {view === "history" && (
          <section className="wf-card">
            <h3>Queue History <span className="wf-sub">all time · {jobs.length} cars</span></h3>
            <div className="wf-scroll">
              <table className="wf-table wf-stack">
                <thead><tr><th>Time</th><th>Queue No.</th><th>Customer</th><th>Service</th><th>Price</th><th>Status</th></tr></thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id}>
                      <td data-label="Time">{j.time}</td><td data-label="Queue No.">#{j.queueNo}</td><td data-label="Customer">{j.customer}</td><td data-label="Service">{j.service}</td><td data-label="Price" className="money">{money(j.price)}</td><td data-label="Status"><StatusPill s={j.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "staff" && <StaffView />}
      </main>
    </div>
  );
}

function StaffView() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['employee', 'owner'])
      .order('full_name');
    if (data) setStaff(data);
    setLoading(false);
  }

  async function createEmployee(e) {
    e.preventDefault();
    setMsg(null);
    
    if (!fullName || !email || !password) {
      return setMsg({ type: 'error', text: 'Please fill in all fields.' });
    }
    if (password.length < 6) {
      return setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
    }

    setCreating(true);

    // Use a temporary client so the Admin doesn't get logged out
    const { createClient } = await import('@supabase/supabase-js');
    const tempSupabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create the user in Supabase Auth
    const { data, error } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'employee'
        }
      }
    });

    if (error) {
      setCreating(false);
      return setMsg({ type: 'error', text: 'Error creating account: ' + error.message });
    }

    // Fallback: If the trigger didn't update the profile, we try manually
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ full_name: fullName, role: 'employee' })
        .eq('id', data.user.id);
    }

    setMsg({ type: 'success', text: `Employee ${fullName} created successfully! Give them the email and password to log in.` });
    setFullName('');
    setEmail('');
    setPassword('');
    setCreating(false);
    fetchStaff(); 
  }

  if (loading) return <p>Loading staff...</p>;

  return (
    <div className="wf-grid-2 wide-left">
      {/* CREATE EMPLOYEE FORM */}
      <section className="wf-card">
        <h3>Add New Employee</h3>
        <p style={{ color: '#a9c4f5', marginBottom: '20px', fontSize: '0.9rem' }}>
          Create login details for a new staff member. They can log in immediately.
        </p>

        <form onSubmit={createEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#a9c4f5' }}>Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="e.g. Luyanda Mthembu"
              className="wf-input" 
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#a9c4f5' }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="employee@washflow.com"
              className="wf-input" 
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#a9c4f5' }}>Temporary Password</label>
            <input 
              type="text" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Minimum 6 characters"
              className="wf-input" 
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>

          {msg && (
            <div style={{ padding: '10px', borderRadius: '8px', fontSize: '0.9rem', background: msg.type === 'error' ? 'rgba(220,50,50,0.2)' : 'rgba(22,163,74,0.2)', color: msg.type === 'error' ? '#ff8a8a' : '#4ade80' }}>
              {msg.text}
            </div>
          )}

          <button type="submit" className="wf-btn" disabled={creating} style={{ marginTop: '10px' }}>
            {creating ? 'Creating...' : 'Create Employee Account'}
          </button>
        </form>
      </section>

      {/* CURRENT STAFF LIST */}
      <section className="wf-card">
        <h3>Current Staff</h3>
        <div className="wf-scroll">
          <table className="wf-table">
            <thead>
              <tr><th>Name</th><th>Role</th></tr>
            </thead>
            <tbody>
              {staff.map((person) => (
                <tr key={person.id}>
                  <td>{person.full_name || 'No name'}</td>
                  <td>
                    <span style={{ 
                      background: person.role === 'owner' ? '#f59e0b' : '#16a34a', 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', textTransform: 'capitalize'
                    }}>
                      {person.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}