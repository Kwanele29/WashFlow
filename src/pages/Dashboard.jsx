import React, { useState, useEffect } from "react";
import {
  House, Clock, Car, Settings, LogOut, Bell, BellRing, ChevronDown, UserRound,
  Eye, Lightbulb, Check, Droplets, Flag, Hourglass, ListOrdered, Menu, X, Info
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: House, href: "/dashboard" },
  { key: "queue", label: "My Queue", icon: Clock, href: "/dashboard" }, 
  { key: "services", label: "Services", icon: Car, href: "/services" }, 
  { key: "account", label: "Account", icon: Settings, href: "/account" },
];

const buildSteps = (queueNumber) => [
  { label: "Joined Queue", sub: queueNumber ? `(#${queueNumber})` : "", icon: Check },
  { label: "Waiting", icon: Car },
  { label: "Being Washed", icon: Droplets },
  { label: "Completed", icon: Flag },
];

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [user, setUser] = useState({ name: "Customer", firstName: "Customer" });
  const [ticket, setTicket] = useState(null);
  const [queueStats, setQueueStats] = useState({ carsAhead: 0, position: 0 });
  const [loading, setLoading] = useState(true);
  const [hasNotified, setHasNotified] = useState(false);
  const [isDataFullyLoaded, setIsDataFullyLoaded] = useState(false);

  // NEW: Controls the red badge
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const name = data.user.user_metadata?.full_name || data.user.email.split('@')[0];
        setUser({ name: name, firstName: name });
      }
    });

    fetchMyTicket();

    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, () => {
        fetchMyTicket();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (isDataFullyLoaded && ticket?.status === 'waiting' && (queueStats.carsAhead === 1 || queueStats.carsAhead === 0) && !hasNotified) {
      setHasNotified(true);
      showToast("Your turn is approaching! Please make your way to the car wash now.");
      setHasUnreadNotification(true); // Show red dot
    }
    if (queueStats.carsAhead > 1) {
      setHasNotified(false);
    }
  }, [queueStats.carsAhead, ticket, hasNotified, isDataFullyLoaded]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000); 
  };

  const handleBellClick = () => {
    // 1. Mark as read (hide red dot)
    setHasUnreadNotification(false);

    // 2. Show the toast message
    if (!ticket) {
      showToast("You have no new notifications. Join the queue to get updates.");
    } else if (ticket.status === 'washing') {
      showToast("Your car is currently being washed! We'll let you know when it's done.");
    } else {
      showToast(`You are currently #${queueStats.position} in line with ${queueStats.carsAhead} cars ahead.`);
    }
  };

  async function fetchMyTicket() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setIsDataFullyLoaded(true);
      return;
    }

    const { data } = await supabase
      .from('queue_tickets')
      .select('*, services(name, price, est_minutes)')
      .eq('customer_id', user.id)
      .in('status', ['waiting', 'washing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      // If the status changed (e.g. waiting -> washing), show a new red dot
      if (ticket && ticket.status !== data.status) {
        setHasUnreadNotification(true);
      } else if (!ticket) {
        // If they just joined the queue, show a red dot
        setHasUnreadNotification(true);
      }
      
      setTicket(data);
      const { count } = await supabase
        .from('queue_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .lt('created_at', data.created_at);
        
      setQueueStats({ carsAhead: count || 0, position: (count || 0) + 1 });
    } else {
      setTicket(null);
      setHasUnreadNotification(false);
    }
    setLoading(false);
    setIsDataFullyLoaded(true);
  }

  let currentStep = 1; 
  let progress = 50;
  if (ticket?.status === 'washing') { currentStep = 2; progress = 75; }
  if (ticket?.status === 'completed') { currentStep = 3; progress = 100; }

  const steps = buildSteps(queueStats.position);
  const stepState = (i) => i < currentStep ? "done" : i === currentStep ? "current" : "todo";

  return (
    <div className="dash">
      
      {toastMessage && (
        <div className="toast-notification">
          <div className="toast-icon"><Info size={24} /></div>
          <div className="toast-text">{toastMessage}</div>
          <button className="toast-close" onClick={() => setToastMessage(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={28} />
        </button>
        <img src="/assets/logo.png" alt="WashFlow" className="mobile-logo" />
        <div style={{ width: 28 }}></div>
      </header>

      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`dash__sidebar ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
          <X size={24} />
        </button>

        <a href="/" className="dash__logo" aria-label="WashFlow home">
          <img src="/assets/logo.png" alt="WashFlow" />
        </a>
        <nav className="dash__nav" aria-label="Main">
          {NAV_ITEMS.map(({ key, label, icon: Icon, href }) => (
            <a key={key} href={href} className={`dash__nav-item ${key === "dashboard" ? "is-active" : ""}`}>
              <Icon size={26} /> <span>{label}</span>
            </a>
          ))}
          <button type="button" className="dash__nav-item dash__nav-item--btn" onClick={onLogout}>
            <LogOut size={26} /> <span>Logout</span>
          </button>
        </nav>
        <div className="dash__sidebar-glow" aria-hidden="true" />
      </aside>

      <main className="dash__main">
        <div className="dash__main-overlay" aria-hidden="true" />

        <header className="dash__topbar">
          <div className="dash__welcome">
            <h1>Welcome back, {user.firstName}!</h1>
            <p>Your car wash journey, made easy.</p>
          </div>

          <div className="dash__user-area">
            <button 
              type="button" 
              className="dash__bell" 
              aria-label="Notifications"
              onClick={handleBellClick}
            >
              <Bell size={30} />
              {/* Only show the red badge if there is an unread notification */}
              {hasUnreadNotification && ticket && <span className="dash__badge">1</span>}
            </button>

            <div className="dash__user">
              <button type="button" className="dash__user-btn" onClick={() => setMenuOpen((o) => !o)}>
                <span className="dash__avatar"><UserRound size={28} /></span>
                <span className="dash__user-name">{user.name}</span>
                <ChevronDown size={18} className={menuOpen ? "is-open" : ""} />
              </button>
              {menuOpen && (
                <div className="dash__menu" role="menu">
                  <a href="/account" role="menuitem">Account</a>
                  <button type="button" role="menuitem" onClick={onLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {loading ? (
          <p style={{ color: 'white', marginTop: '50px' }}>Loading your queue status...</p>
        ) : !ticket ? (
          <section className="card dash__status" style={{ textAlign: 'center', padding: '50px' }}>
            <h2>You are not in the queue</h2>
            <p style={{ marginBottom: '20px', color: '#4a5b78' }}>Join the queue to track your car wash live.</p>
            <button 
              onClick={() => navigate('/queue')} 
              style={{ padding: '15px 30px', background: '#0b63f6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Join Queue Now
            </button>
          </section>
        ) : (
          <>
            <section className="card dash__status" aria-labelledby="status-title">
              <div className="card__head">
                <ListOrdered size={34} className="card__head-icon" />
                <h2 id="status-title">Your Queue Status</h2>
              </div>

              <div className="status__numbers">
                <div className="status__col">
                  <span className="status__label">Your Number</span>
                  <span className="status__big">#{queueStats.position}</span>
                </div>
                <span className="status__sep" aria-hidden="true" />
                <div className="status__col status__col--ahead">
                  <Car size={34} />
                  <span className="status__label">Cars Ahead</span>
                  <span className="status__ahead">{queueStats.carsAhead}</span>
                </div>
              </div>

              <div className="status__progress">
                <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="progress__fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="status__pct">{progress}%</span>
              </div>

              <div className="status__wait">
                <span className="status__wait-label"><Clock size={34} /> Estimated Wait Time</span>
                <span className="status__wait-value" style={{ color: (queueStats.carsAhead === 0 || ticket?.status === 'washing') ? '#19a7ff' : 'inherit' }}>
                  {ticket?.status === 'washing' 
                    ? "In Wash Bay" 
                    : queueStats.carsAhead === 0 
                      ? "You are next!" 
                      : `~ ${queueStats.carsAhead * 15} min`}
                </span>
              </div>
            </section>

            <div className="dash__bottom">
              <section className="card card--sm dash__service" aria-labelledby="service-title">
                <div className="card__head card__head--sm">
                  <Car size={26} />
                  <h3 id="service-title">Service Details</h3>
                </div>
                <div className="service__body" style={{ padding: '20px' }}>
                  <div className="service__info">
                    <span className="service__label">Service Type</span>
                    <strong>{ticket.services?.name || "Wash"}</strong>
                    <span className="service__label service__label--gap">Price</span>
                    <strong className="service__price">R{ticket.services?.price || 0}</strong>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="service__btn" 
                  onClick={() => showToast(`Service: ${ticket.services?.name} | Price: R${ticket.services?.price}`)}
                >
                  <Eye size={18} /> View Details
                </button>
              </section>

              <section className="card card--sm dash__journey" aria-labelledby="journey-title">
                <div className="card__head card__head--sm">
                  <Hourglass size={26} />
                  <h3 id="journey-title">Queue Journey</h3>
                </div>
                <ol className="journey">
                  {steps.map(({ label, sub, icon: Icon }, i) => (
                    <li key={label} className={`journey__step is-${stepState(i)}`}>
                      <span className="journey__dot">
                        <Icon size={30} strokeWidth={stepState(i) === "done" ? 3 : 2} />
                      </span>
                      <span className="journey__label">
                        {label}
                        {sub && <small>{sub}</small>}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="card card--sm dash__tip" aria-labelledby="tip-title">
                <div className="card__head card__head--sm">
                  <Lightbulb size={28} className="tip__bulb" />
                  <h3 id="tip-title">Quick Tip</h3>
                </div>
                <p>You'll get a notification when it's almost your turn.</p>
                <BellRing size={78} strokeWidth={1.5} className="tip__bell" aria-hidden="true" />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}