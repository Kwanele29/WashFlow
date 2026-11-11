import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  House, Clock, Car, LogOut, Bell, UserRound, Check, Droplets, Flag, Ticket, Star,
  Droplet, Loader, Activity, X, Info, Menu,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

/* ---------- things you may want to change ---------- */
const BAYS = 2;                 
const DEFAULT_MINUTES = 15;     
const COMPLETED_VISIBLE_MIN = 30; 

/* ---------- helpers ---------- */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const fmtClock = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const money = (n) => (n === undefined || n === null || n === "" ? "—" : `R${Number(n).toFixed(2)}`);

const STEPS = [
  { label: "Joined Queue", icon: Check },
  { label: "Waiting", icon: Car },
  { label: "Being Washed", icon: Droplets },
  { label: "Completed", icon: Flag },
];

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [user, setUser] = useState({ name: "Customer", firstName: "Customer" });
  const [ticket, setTicket] = useState(null);
  const [stats, setStats] = useState({ carsAhead: 0, waitMin: 0, queueNumber: 0 });
  const [loading, setLoading] = useState(true);
  const [justCancelled, setJustCancelled] = useState(false);
  const [notes, setNotes] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const userRef = useRef(null);
  const reqRef = useRef(0);
  const notesRef = useRef([]);
  const toastTimer = useRef(null);
  const statusCardRef = useRef(null);
  const notesCardRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const persistNotes = useCallback(() => {
    try {
      if (userRef.current) localStorage.setItem(`wf_notes_${userRef.current}`, JSON.stringify(notesRef.current));
    } catch { /* storage is optional */ }
  }, []);

  const addNote = useCallback((key, title, text, { toast = true, at } = {}) => {
    if (notesRef.current.some((n) => n.key === key)) return;
    const note = { key, title, text, at: at || new Date().toISOString(), read: false };
    notesRef.current = [note, ...notesRef.current]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 20);
    setNotes(notesRef.current);
    persistNotes();
    if (toast) showToast(`${title} ${text}`);
  }, [persistNotes, showToast]);

  const markAllRead = () => {
    notesRef.current = notesRef.current.map((n) => ({ ...n, read: true }));
    setNotes(notesRef.current);
    persistNotes();
  };

  /* ---------- data ---------- */
  const fetchMyTicket = useCallback(async () => {
    const my = ++reqRef.current; 
    let uid = userRef.current;
    if (!uid) {
      const { data } = await supabase.auth.getUser();
      uid = data?.user?.id || null;
      userRef.current = uid;
    }
    if (!uid) { setLoading(false); return; }

    const { data: latest, error } = await supabase
      .from("queue_tickets")
      .select("*, services(name, price, est_minutes)")
      .eq("customer_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (my !== reqRef.current) return;
    if (error) { setLoading(false); return; }

    const status = latest?.status;
    const isActive = status === "waiting" || status === "washing";
    const recentlyDone =
      status === "completed" && latest.completed_at &&
      Date.now() - new Date(latest.completed_at).getTime() < COMPLETED_VISIBLE_MIN * 60000;

    if (latest && (isActive || recentlyDone)) {
      let carsAhead = 0;
      let waitMin = 0;
      let queueNumber = latest.queue_number ?? latest.ticket_number ?? 0;

      if (status === "waiting") {
        const { data: ahead } = await supabase
          .from("queue_tickets")
          .select("id, services(est_minutes)")
          .eq("status", "waiting")
          .lt("created_at", latest.created_at);
        carsAhead = ahead?.length || 0;
        waitMin = Math.ceil(
          (ahead || []).reduce((sum, t) => sum + (t.services?.est_minutes || DEFAULT_MINUTES), 0) / BAYS
        );
      }
      
      // THE FIX: Queue number is strictly (cars ahead + 1) for waiting, or #1 if being washed
      if (status === "waiting") {
        queueNumber = carsAhead + 1;
      } else if (status === "washing") {
        queueNumber = 1;
      } else if (!queueNumber) {
        // Fallback for completed if no number was saved
        const { count } = await supabase
          .from("queue_tickets")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfToday().toISOString())
          .lte("created_at", latest.created_at);
        queueNumber = count || 1;
      }

      if (my !== reqRef.current) return;

      setTicket(latest);
      setStats({ carsAhead, waitMin, queueNumber });
      setJustCancelled(false);

      addNote(`${latest.id}:joined`, "You joined the queue.", `Your number is #${queueNumber}.`, { toast: false, at: latest.created_at });
      if (status === "waiting" && carsAhead <= 1) {
        addNote(`${latest.id}:near`, "Your turn is approaching!", carsAhead === 0 ? "You're next in line." : "Only 1 car ahead of you.");
      }
      if (status === "washing") addNote(`${latest.id}:washing`, "Your car is being washed!", "We'll let you know when it's done.");
      if (status === "completed") addNote(`${latest.id}:done`, "Your wash is complete!", "Thank you for choosing WashFlow.");
    } else {
      setTicket(null);
      const cancelledToday = status === "cancelled" && new Date(latest.created_at) >= startOfToday();
      setJustCancelled(cancelledToday);
      if (cancelledToday) addNote(`${latest.id}:cancelled`, "Your queue entry was cancelled.", "Join again any time.");
    }
    setLoading(false);
  }, [addNote]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (u && alive) {
        userRef.current = u.id;
        const name = u.user_metadata?.full_name || u.email?.split("@")[0] || "Customer";
        setUser({ name, firstName: name.split(" ")[0] });
        try {
          notesRef.current = JSON.parse(localStorage.getItem(`wf_notes_${u.id}`) || "[]");
          setNotes(notesRef.current);
        } catch { /* ignore */ }
      }
      if (alive) fetchMyTicket();
    })();

    const channel = supabase.channel("dashboard-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_tickets" }, () => fetchMyTicket())
      .subscribe();
    const poll = setInterval(fetchMyTicket, 30000);

    return () => {
      alive = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [fetchMyTicket]);

  /* ---------- actions ---------- */
  const canCancel = ticket?.status === "waiting";

  async function cancelQueue() {
    setMobileMenu(false);
    if (!canCancel) return;
    if (!window.confirm("Cancel your place in the queue?")) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("queue_tickets")
      .update({ status: "cancelled" })
      .eq("id", ticket.id)
      .eq("status", "waiting") 
      .select("id");
    setBusy(false);
    if (error) showToast("Could not cancel: " + error.message);
    else if (!data || data.length === 0) showToast("Your car has just been called, so it can't be cancelled now.");
    fetchMyTicket();
  }

  const logout = onLogout || (async () => {
    await supabase.auth.signOut();
    navigate("/login");
  });

  const scrollTo = (ref) => {
    setMobileMenu(false);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const handleBell = () => { markAllRead(); scrollTo(notesCardRef); };

  /* ---------- derived ---------- */
  const unread = notes.filter((n) => !n.read).length;

  let currentStep = 1;
  if (ticket?.status === "washing") currentStep = 2;
  if (ticket?.status === "completed") currentStep = 4;
  const stepState = (i) => (i < currentStep ? "done" : i === currentStep ? "current" : "todo");

  let bar = { cls: "is-waiting", label: "Waiting in Queue", icon: <Loader size={34} className="spin" /> };
  if (ticket?.status === "waiting" && stats.carsAhead === 0) bar = { cls: "is-next", label: "You're Next!", icon: <Loader size={34} className="spin" /> };
  if (ticket?.status === "washing") bar = { cls: "is-washing", label: "Being Washed", icon: <Droplets size={34} /> };
  if (ticket?.status === "completed") bar = { cls: "is-done", label: "Completed", icon: <Check size={34} strokeWidth={3} /> };

  let waitText = `~ ${stats.waitMin} min`;
  if (ticket?.status === "waiting" && stats.carsAhead === 0) waitText = "You're next!";
  if (ticket?.status === "washing") waitText = "In Wash Bay";
  if (ticket?.status === "completed") waitText = "Done";

  return (
    <div className="dash">

      {toastMessage && (
        <div className="toast-notification">
          <div className="toast-icon"><Info size={24} /></div>
          <div className="toast-text">{toastMessage}</div>
          <button className="toast-close" onClick={() => setToastMessage(null)} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      )}

      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setMobileMenu(true)} aria-label="Open menu">
          <Menu size={28} />
        </button>
        <img src="/assets/logo.png" alt="WashFlow" className="mobile-logo" />
        <div style={{ width: 28 }} />
      </header>

      {mobileMenu && <div className="mobile-overlay" onClick={() => setMobileMenu(false)} />}

      <aside className={`dash__sidebar ${mobileMenu ? "is-open" : ""}`}>
        <button className="mobile-close-btn" onClick={() => setMobileMenu(false)} aria-label="Close menu">
          <X size={24} />
        </button>

        <a href="/" className="dash__logo" aria-label="WashFlow home">
          <img src="/assets/logo.png" alt="WashFlow" />
        </a>

        <nav className="dash__nav" aria-label="Main">
          <button type="button" className="dash__nav-item is-active"
            onClick={() => { setMobileMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <House size={26} /> <span>Dashboard</span>
          </button>
          <button type="button" className="dash__nav-item" onClick={() => scrollTo(statusCardRef)}>
            <Clock size={26} /> <span>My Queue</span>
          </button>
          <button type="button" className="dash__nav-item" onClick={handleBell}>
            <Bell size={26} /> <span>Notifications</span>
            {unread > 0 && <em className="nav-count">{unread}</em>}
          </button>
          <button type="button" className="dash__nav-item" onClick={cancelQueue}
            disabled={!canCancel || busy}
            title={canCancel ? "" : "You can cancel while you are waiting in the queue"}>
            <span className="nav-x"><X size={18} strokeWidth={3.5} /></span> <span>Cancel Queue</span>
          </button>
          <button type="button" className="dash__nav-item" onClick={logout}>
            <LogOut size={26} /> <span>Logout</span>
          </button>
        </nav>

        <div className="dash__thanks">
          <Droplet size={36} />
          <p>Thanks for choosing WashFlow!</p>
        </div>
        <div className="dash__sidebar-glow" aria-hidden="true" />
      </aside>

      <main className="dash__main">
        <div className="dash__main-overlay" aria-hidden="true" />

        <header className="dash__topbar">
          <div className="dash__welcome">
            <h1>Welcome back, <span className="accent">{user.firstName}!</span></h1>
            <p>Sit back, relax. We'll let you know when your turn is near.</p>
          </div>

          <div className="dash__user-area">
            <button type="button" className="dash__bell" aria-label="Notifications" onClick={handleBell}>
              <Bell size={30} />
              {unread > 0 && <span className="dash__badge">{unread}</span>}
            </button>
            <span className="dash__avatar" title={user.name}><UserRound size={28} /></span>
          </div>
        </header>

        {loading ? (
          <p className="dash__loading">Loading your queue status...</p>
        ) : (
          <>
            <div className="dash__left">
              {!ticket ? (
                <section className="card dash__status dash__empty" ref={statusCardRef}>
                  <h2>You are not in the queue</h2>
                  <p>{justCancelled ? "Your last queue entry was cancelled." : "Join the queue to track your car wash live."}</p>
                  <button type="button" className="dash__join" onClick={() => navigate("/queue")}>
                    Join Queue Now
                  </button>
                </section>
              ) : (
                <>
                  <section className="card dash__status" ref={statusCardRef} aria-labelledby="status-title">
                    <div className="card__head">
                      <Ticket size={34} className="card__head-icon" />
                      <h2 id="status-title">Your Queue Status</h2>
                    </div>

                    <div className="status__numbers">
                      <div className="status__col">
                        <span className="status__label">Queue Number</span>
                        <div className="ticket">
                          <span className="ticket__no">#{stats.queueNumber}</span>
                          <span className="ticket__bars" aria-hidden="true" />
                        </div>
                      </div>
                      <span className="status__sep" aria-hidden="true" />
                      <div className="status__col">
                        <span className="status__label">Cars Ahead</span>
                        <div className="status__value">
                          <Car size={50} className="status__icon" />
                          <span className="status__ahead">{stats.carsAhead}</span>
                        </div>
                      </div>
                      <span className="status__sep" aria-hidden="true" />
                      <div className="status__col">
                        <span className="status__label">Estimated Waiting Time</span>
                        <div className="status__value">
                          <Clock size={50} className="status__icon" />
                          <span className="status__wait">{waitText}</span>
                        </div>
                      </div>
                    </div>

                    <div className="status__current">
                      <span className="status__label">Current Status</span>
                      <div className={`status__bar ${bar.cls}`}>{bar.icon}<strong>{bar.label}</strong></div>
                    </div>
                  </section>

                  <section className="card card--sm dash__journey" aria-labelledby="journey-title">
                    <div className="card__head card__head--sm">
                      <Activity size={26} className="card__head-icon" />
                      <h3 id="journey-title">Your Queue Progress</h3>
                    </div>
                    <ol className="journey">
                      {STEPS.map(({ label, icon: Icon }, i) => (
                        <li key={label} className={`journey__step is-${stepState(i)}`}>
                          <span className="journey__dot">
                            <Icon size={30} strokeWidth={stepState(i) === "done" ? 3 : 2} />
                          </span>
                          <span className="journey__label">{label}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              )}
            </div>

            <div className="dash__right">
              {ticket && (
                <section className="card card--sm dash__service" aria-labelledby="service-title">
                  <div className="card__head card__head--sm">
                    <Star size={28} className="star" fill="currentColor" />
                    <h3 id="service-title">Selected Service</h3>
                  </div>
                  <div className="service__body">
                    <span className="service__icon"><Car size={52} /><Droplets size={22} className="service__drops" /></span>
                    <div className="service__info">
                      <strong>{ticket.services?.name || "Wash"}</strong>
                      <span className="service__price">{money(ticket.services?.price)}</span>
                    </div>
                  </div>
                </section>
              )}

              <section className="card card--sm dash__notes" ref={notesCardRef} aria-labelledby="notes-title">
                <div className="card__head card__head--sm">
                  <Bell size={26} className="star" fill="currentColor" />
                  <h3 id="notes-title">Notifications</h3>
                </div>
                <ul className="notes">
                  {notes.map((n) => (
                    <li key={n.key} className={`note ${n.read ? "" : "is-unread"}`}>
                      <span className="note__icon"><Info size={20} strokeWidth={3} /></span>
                      <div className="note__body">
                        <strong>{n.title}</strong>
                        <span>{n.text}</span>
                        <time>{fmtClock(n.at)}</time>
                      </div>
                    </li>
                  ))}
                  {notes.length === 0 && (
                    <li className="note note--empty">Nothing yet. We'll let you know when your turn is near.</li>
                  )}
                </ul>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}