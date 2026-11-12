import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Play, CheckCircle, Car, LogOut, Home, Clock, XCircle, UserX,
  Droplets, Flag, Hourglass, History, Settings, Zap, Eye, ArrowUp, User, Menu, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './EmployeeDashboard.css'

const BAYS = 2
const DEFAULT_MINUTES = 15
const SELECT = '*, services(name, est_minutes), profiles!customer_id(full_name)'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const minutesBetween = (a, b) =>
  a && b ? Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000)) : null
const customerName = (t) => t.profiles?.full_name || 'Customer'
const STATUS_TEXT = { waiting: 'Waiting', washing: 'Being Washed', completed: 'Completed', cancelled: 'Cancelled' }

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.start()
    osc.stop(ctx.currentTime + 0.18)
    setTimeout(() => ctx.close(), 400)
  } catch { /* sound is optional */ }
}

function StatusPill({ ticket, firstWaiting }) {
  let label = STATUS_TEXT[ticket.status] || ticket.status
  let cls = ticket.status
  let icon = <Clock size={16} />
  if (ticket.status === 'waiting' && !firstWaiting) { label = 'In Queue'; cls = 'inqueue'; icon = <Car size={16} /> }
  if (ticket.status === 'washing') icon = <Droplets size={16} />
  if (ticket.status === 'completed') icon = <CheckCircle size={16} />
  if (ticket.status === 'cancelled') icon = <XCircle size={16} />
  return <span className={`st-pill st-${cls}`}>{icon}{label}</span>
}

export default function EmployeeDashboard() {
  const navigate = useNavigate()

  const [tab, setTab] = useState('dashboard')
  const [tickets, setTickets] = useState([])
  const [completedToday, setCompletedToday] = useState(0)
  const [me, setMe] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [viewTicket, setViewTicket] = useState(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(new Date())
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [live, setLive] = useState(false)
  const [toast, setToast] = useState(null)
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem('wf_sound') !== 'off' } catch { return true }
  })

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const soundRef = useRef(soundOn)
  const toastTimer = useRef(null)
  useEffect(() => {
    soundRef.current = soundOn
    try { localStorage.setItem('wf_sound', soundOn ? 'on' : 'off') } catch { /* ignore */ }
  }, [soundOn])

  // stop the page behind the slide-out menu from scrolling while it is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  const notify = useCallback((text, type = 'ok') => {
    setToast({ text, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchQueue = useCallback(async () => {
    const start = startOfToday().toISOString()

    const [active, finished, done] = await Promise.all([
      supabase.from('queue_tickets').select(SELECT)
        .in('status', ['waiting', 'washing'])
        .order('created_at', { ascending: true }),
      supabase.from('queue_tickets').select(SELECT)
        .in('status', ['completed', 'cancelled'])
        .gte('created_at', start)
        .order('created_at', { ascending: true }),
      supabase.from('queue_tickets').select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', start),
    ])

    if (active.error) { notify('Could not load the queue: ' + active.error.message, 'error'); return }
    setTickets([...(active.data || []), ...(finished.data || [])])
    if (done.count !== null && done.count !== undefined) setCompletedToday(done.count)
  }, [notify])

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      if (!cancelled) {
        setMe({ id: user.id, email: user.email, name: profile?.full_name || user.email?.split('@')[0] || 'there' })
      }
    }
    loadMe()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    fetchQueue()
    const channel = supabase.channel('emp-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          notify('New customer joined the queue.', 'info')
          if (soundRef.current) beep()
        }
        fetchQueue()
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))
    const poll = setInterval(fetchQueue, 30000)
    return () => { clearInterval(poll); supabase.removeChannel(channel) }
  }, [fetchQueue, notify])

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 15000)
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { clearInterval(clock); window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  const numbered = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    return sorted.map((t, i) => ({ ...t, no: t.queue_number ?? t.ticket_number ?? i + 1 }))
  }, [tickets])

  const waiting = numbered.filter((t) => t.status === 'waiting')
  const washing = numbered.filter((t) => t.status === 'washing')
  const finished = numbered.filter((t) => t.status === 'completed' || t.status === 'cancelled').reverse()
  const nextCar = waiting[0]
  const tableRows = [...washing, ...waiting, ...finished.slice(0, 5)]

  const selected = numbered.find((t) => t.id === selectedId && (t.status === 'waiting' || t.status === 'washing')) || null
  const completeTarget = selected?.status === 'washing' ? selected : (washing.length === 1 ? washing[0] : null)

  const waitMinutes = Math.ceil(
    waiting.reduce((sum, t) => sum + (t.services?.est_minutes || DEFAULT_MINUTES), 0) / BAYS
  )
  const totalToday = completedToday + waiting.length + washing.length
  const progress = totalToday ? Math.round((completedToday / totalToday) * 100) : 0

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  const firstName = (me?.name || '').split(' ')[0]

  async function updateStatus(ticket, newStatus, okMessage) {
    const allowedFrom = newStatus === 'washing' ? ['waiting'] : newStatus === 'completed' ? ['washing'] : ['waiting', 'washing']
    const updates = { status: newStatus }
    if (newStatus === 'washing') {
      updates.assigned_employee = me?.id
      updates.started_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    setBusy(true)
    const { data, error } = await supabase
      .from('queue_tickets')
      .update(updates)
      .eq('id', ticket.id)
      .in('status', allowedFrom)
      .select('id')
    setBusy(false)

    if (error) notify('Error: ' + error.message, 'error')
    else if (!data || data.length === 0) notify('That ticket was already changed by someone else.', 'error')
    else notify(okMessage)
    fetchQueue()
  }

  const startWash = (t) => updateStatus(t, 'washing', `Started washing #${t.no} – ${customerName(t)}.`)
  const completeWash = (t) => updateStatus(t, 'completed', `#${t.no} completed.`)
  const markNoShow = (t) => {
    if (window.confirm(`Mark #${t.no} – ${customerName(t)} as a no-show?`)) updateStatus(t, 'cancelled', `#${t.no} marked as no-show.`)
  }
  const cancelEntry = (t) => {
    if (window.confirm(`Cancel #${t.no} – ${customerName(t)}?`)) updateStatus(t, 'cancelled', `#${t.no} cancelled.`)
  }

  async function moveUp(ticket) {
    const idx = waiting.findIndex((t) => t.id === ticket.id)
    if (idx <= 0) return
    const above = waiting[idx - 1]
    setBusy(true)
    const [a, b] = await Promise.all([
      supabase.from('queue_tickets').update({ created_at: above.created_at }).eq('id', ticket.id),
      supabase.from('queue_tickets').update({ created_at: ticket.created_at }).eq('id', above.id),
    ])
    setBusy(false)
    if (a.error || b.error) notify('Error: ' + (a.error || b.error).message, 'error')
    else notify(`#${ticket.no} moved up.`)
    fetchQueue()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const goTab = (key) => { setTab(key); setIsMobileMenuOpen(false) }

  return (
    <div className="emp-layout">

      {/* MOBILE TOP HEADER */}
      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
          <Menu size={28} />
        </button>
        <img src="/assets/logo.png" alt="WashFlow" className="mobile-logo" />
        <div style={{ width: 28 }}></div>
      </header>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`emp-sidebar ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
          <X size={24} />
        </button>

        <div className="emp-logo">
          <img src="/assets/logo.png" alt="WashFlow" />
        </div>
        <nav className="emp-nav">
          <button className={`emp-nav-item ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => goTab('dashboard')}>
            <Home size={20} /> Employee Dashboard
          </button>
          <button className={`emp-nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => goTab('history')}>
            <History size={20} /> Queue History
          </button>
          <button className={`emp-nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => goTab('settings')}>
            <Settings size={20} /> Settings
          </button>
        </nav>
        <button className="emp-nav-item emp-logout" onClick={handleLogout}>
          <LogOut size={20} /> Logout
        </button>
      </aside>

      <main className="emp-main">
        <header className="emp-header">
          <div className="emp-welcome">
            <h1>{greeting}{firstName ? ', ' : ''}<span className="accent">{firstName}{firstName ? '!' : ''}</span></h1>
            <p>Manage the queue and keep customers moving.</p>
          </div>
          <div className="emp-topbar">
            <div className="emp-status-pill">
              <span className={`status-dot ${online ? 'on' : 'off'}`} />
              <b>{online ? 'Online' : 'Offline'}</b>
              <span className="status-sep" />
              <Clock size={22} />
              <div className="status-clock">
                <b>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</b>
                <small>{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</small>
              </div>
            </div>
            <div className="emp-avatar" title={me?.email || ''}><User size={26} /></div>
          </div>
        </header>

        {tab === 'dashboard' && (
          <>
            <div className="emp-metrics">
              <div className="emp-metric-card">
                <div className="metric-icon"><Car size={44} /></div>
                <div>
                  <h2 className="metric-value">{waiting.length}</h2>
                  <p className="metric-label">Cars Waiting</p>
                </div>
              </div>
              <div className="emp-metric-card">
                <div className="metric-icon"><Droplets size={44} /></div>
                <div>
                  <h2 className="metric-value">{washing.length}</h2>
                  <p className="metric-label">Being Washed</p>
                </div>
              </div>
              <div className="emp-metric-card">
                <div className="metric-icon"><Flag size={44} /></div>
                <div>
                  <h2 className="metric-value">{completedToday}</h2>
                  <p className="metric-label">Completed Today</p>
                </div>
              </div>
              <div className="emp-metric-card">
                <div className="metric-icon"><Hourglass size={44} /></div>
                <div>
                  <h2 className="metric-value">{waiting.length ? `~ ${waitMinutes} min` : 'No wait'}</h2>
                  <p className="metric-label">Est. Wait Time</p>
                </div>
              </div>
            </div>

            <div className="emp-mid">
              <section className="emp-panel">
                <div className="panel-head">
                  <h2 className="panel-title"><User size={24} /> Current Queue</h2>
                  <span className={`live-badge ${live ? 'on' : ''}`}><span className="status-dot on" /> {live ? 'Live' : 'Updating'}</span>
                </div>

                <div className="q-scroll">
                  <table className="q-table q-cards">
                    <thead>
                      <tr><th>#</th><th>Customer</th><th>Service</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {tableRows.map((t) => {
                        const isActive = t.status === 'waiting' || t.status === 'washing'
                        const firstWaiting = nextCar?.id === t.id
                        return (
                          <tr
                            key={t.id}
                            className={`${isActive ? 'selectable' : ''} ${selected?.id === t.id ? 'is-selected' : ''}`}
                            onClick={() => isActive && setSelectedId(selectedId === t.id ? null : t.id)}
                          >
                            <td className="q-no">#{t.no}</td>
                            <td className="q-cust">{customerName(t)}</td>
                            <td className="q-svc">{t.services?.name || '—'}</td>
                            <td className="q-stat"><StatusPill ticket={t} firstWaiting={firstWaiting} /></td>
                            <td className="q-act" onClick={(e) => e.stopPropagation()}>
                              {t.status === 'washing' && (
                                <button className="row-btn complete" disabled={busy} onClick={() => completeWash(t)}>
                                  <CheckCircle size={16} /> Complete
                                </button>
                              )}
                              {t.status === 'waiting' && firstWaiting && (
                                <button className="row-btn call" disabled={busy} onClick={() => startWash(t)}>
                                  <Play size={16} /> Call Next
                                </button>
                              )}
                              {t.status === 'waiting' && !firstWaiting && (
                                <button className="row-btn move" disabled={busy} onClick={() => moveUp(t)}>
                                  <ArrowUp size={16} /> Move Up
                                </button>
                              )}
                              {(t.status === 'completed' || t.status === 'cancelled') && (
                                <button className="row-btn view" onClick={() => setViewTicket(t)}>
                                  <Eye size={16} /> View
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {tableRows.length === 0 && (
                        <tr className="q-empty-row"><td colSpan="5" className="q-empty">No cars in the queue right now.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="emp-panel">
                <div className="panel-head">
                  <h2 className="panel-title"><Zap size={24} className="bolt" /> Quick Actions</h2>
                </div>
                <p className="qa-hint">
                  {selected ? <>Selected: <b>#{selected.no} · {customerName(selected)}</b></> : 'Tap a car in the queue to pick it.'}
                </p>
                <div className="qa-list">
                  <button className="qa-btn green" disabled={!nextCar || busy} onClick={() => startWash(nextCar)}>
                    <Play size={22} fill="currentColor" /> Call Next Car
                  </button>
                  <button className="qa-btn blue" disabled={selected?.status !== 'waiting' || busy} onClick={() => startWash(selected)}>
                    <Droplets size={22} /> Start Washing
                  </button>
                  <button className="qa-btn navy" disabled={!completeTarget || busy} onClick={() => completeWash(completeTarget)}>
                    <CheckCircle size={22} /> Complete Wash
                  </button>
                  <button className="qa-btn orange" disabled={selected?.status !== 'waiting' || busy} onClick={() => markNoShow(selected)}>
                    <UserX size={22} /> Mark No-Show
                  </button>
                  <button className="qa-btn red" disabled={!selected || busy} onClick={() => cancelEntry(selected)}>
                    <XCircle size={22} /> Cancel Entry
                  </button>
                </div>
              </section>
            </div>

            <div className="emp-bottom">
              <section className="emp-panel progress-panel">
                <div className="progress-left">
                  <h2 className="panel-title"><Flag size={24} /> Queue Progress</h2>
                  <div className="prog-row">
                    <div className="prog-bar"><div className="prog-fill" style={{ width: `${progress}%` }} /></div>
                    <span className="prog-pct">{progress}%</span>
                  </div>
                  <p className="prog-note">
                    {waiting.length} {waiting.length === 1 ? 'car' : 'cars'} still waiting · {completedToday} done today
                  </p>
                </div>
                <div className="progress-divider" />
                <div className="progress-right">
                  <Car size={46} className="progress-car" />
                  <div>
                    <span className="progress-label">Next In Line</span>
                    <strong className="progress-no">{nextCar ? `#${nextCar.no}` : '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="emp-panel alert-panel">
                <h2 className="alert-title">Next Customer Alert</h2>
                {nextCar ? (
                  <>
                    <p className="alert-text">{customerName(nextCar)} is next – get ready!</p>
                    <p className="alert-sub">{nextCar.services?.name} · about {nextCar.services?.est_minutes || DEFAULT_MINUTES} min</p>
                  </>
                ) : (
                  <p className="alert-text">No customers waiting. Enjoy the break!</p>
                )}
                <svg className="alert-wave" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="waveGrad" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#0b63f6" stopOpacity="0" />
                      <stop offset="60%" stopColor="#19a7ff" />
                      <stop offset="100%" stopColor="#19e0ff" />
                    </linearGradient>
                  </defs>
                  <path d="M0 48 C 70 10, 130 12, 200 36 S 330 58, 400 14" fill="none" stroke="url(#waveGrad)" strokeWidth="3" />
                  <path d="M0 56 C 80 24, 140 26, 210 46 S 340 60, 400 30" fill="none" stroke="url(#waveGrad)" strokeWidth="2" opacity=".5" />
                </svg>
              </section>
            </div>
          </>
        )}

        {tab === 'history' && <HistoryView meId={me?.id} />}

        {tab === 'settings' && (
          <SettingsView
            me={me}
            soundOn={soundOn}
            setSoundOn={setSoundOn}
            notify={notify}
            onNameSaved={(name) => setMe((m) => ({ ...m, name }))}
          />
        )}
      </main>

      {viewTicket && <TicketModal ticket={viewTicket} onClose={() => setViewTicket(null)} />}
      {toast && <div className={`emp-toast ${toast.type}`}>{toast.text}</div>}
    </div>
  )
}

function HistoryView({ meId }) {
  const [range, setRange] = useState('today')
  const [mineOnly, setMineOnly] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let q = supabase.from('queue_tickets')
        .select('*, services(name), profiles!customer_id(full_name)')
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(200)
      if (range !== 'all') {
        const from = startOfToday()
        if (range === '7d') from.setDate(from.getDate() - 6)
        q = q.gte('created_at', from.toISOString())
      }
      if (mineOnly && meId) q = q.eq('assigned_employee', meId)
      const { data } = await q
      if (!cancelled) { setRows(data || []); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [range, mineOnly, meId])

  const completed = rows.filter((r) => r.status === 'completed').length
  const cancelled = rows.filter((r) => r.status === 'cancelled').length

  return (
    <section className="emp-panel">
      <div className="panel-head">
        <h2 className="panel-title"><History size={24} /> Queue History</h2>
        <span className="hist-summary">{completed} completed · {cancelled} cancelled</span>
      </div>

      <div className="hist-filters">
        <select className="emp-input" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="all">All time</option>
        </select>
        <label className="emp-check">
          <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
          Only cars I washed
        </label>
      </div>

      <div className="q-scroll tall">
        <table className="q-table q-stack">
          <thead>
            <tr><th>Date</th><th>Customer</th><th>Service</th><th>Status</th><th>Time Taken</th></tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const mins = minutesBetween(t.started_at, t.completed_at)
              return (
                <tr key={t.id}>
                  <td data-label="Date">{fmtDateTime(t.completed_at || t.created_at)}</td>
                  <td data-label="Customer">{customerName(t)}</td>
                  <td data-label="Service">{t.services?.name || '—'}</td>
                  <td data-label="Status"><StatusPill ticket={t} /></td>
                  <td data-label="Time Taken">{mins ? `${mins} min` : '—'}</td>
                </tr>
              )
            })}
            {!loading && rows.length === 0 && <tr className="q-empty-row"><td colSpan="5" className="q-empty">Nothing here yet.</td></tr>}
            {loading && <tr className="q-empty-row"><td colSpan="5" className="q-empty">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SettingsView({ me, soundOn, setSoundOn, notify, onNameSaved }) {
  const [name, setName] = useState(me?.name || '')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setName(me?.name || '') }, [me?.name])

  async function save(e) {
    e.preventDefault()
    if (!name.trim() || !me) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', me.id)
    setSaving(false)
    if (error) notify('Error: ' + error.message, 'error')
    else { onNameSaved(name.trim()); notify('Name updated.') }
  }

  return (
    <section className="emp-panel settings-panel">
      <div className="panel-head">
        <h2 className="panel-title"><Settings size={24} /> Settings</h2>
      </div>
      <form className="settings-form" onSubmit={save}>
        <label>
          Display name
          <input className="emp-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Email
          <input className="emp-input" value={me?.email || ''} disabled />
        </label>
        <button className="btn-save" type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save name'}
        </button>
      </form>
      <label className="emp-check settings-check">
        <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
        Play a sound when a new customer joins the queue
      </label>
    </section>
  )
}

function TicketModal({ ticket, onClose }) {
  const mins = minutesBetween(ticket.started_at, ticket.completed_at)
  const rows = [
    ['Queue No.', `#${ticket.no}`],
    ['Customer', customerName(ticket)],
    ['Service', ticket.services?.name || '—'],
    ['Status', STATUS_TEXT[ticket.status] || ticket.status],
    ['Joined', fmtDateTime(ticket.created_at)],
    ['Started', fmtDateTime(ticket.started_at)],
    ['Finished', fmtDateTime(ticket.completed_at)],
    ['Time taken', mins ? `${mins} min` : '—'],
  ]
  return (
    <div className="emp-modal-overlay" onClick={onClose}>
      <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Ticket details</h2>
        <dl>
          {rows.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
        </dl>
        <button className="btn-save" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}