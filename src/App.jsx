import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
// FIXED: Matched the exact file name from your sidebar (lowercase f and h)
import WashFlowHome from './pages/Washflowhome'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ResetPassword from './pages/ResetPassword'
import CustomerQueue from './pages/CustomerQueue'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Account from './pages/Account'
import AdminDashboard from './pages/AdminDashboard'

const homeFor = (role) => (role === 'owner' ? '/admin' : role === 'employee' ? '/employee' : '/dashboard')

// Home page buttons: logged in -> go where they asked, not logged in -> login page
function HomeWrapper() {
  const navigate = useNavigate()

  const goIfLoggedIn = async (path) => {
    const { data } = await supabase.auth.getSession()
    navigate(data.session ? path : '/login')
  }

  return (
    <WashFlowHome
      onJoinQueue={() => goIfLoggedIn('/queue')}
      onTrackQueue={() => goIfLoggedIn('/dashboard')}
      onSignIn={() => navigate('/login')}
      onCreateAccount={() => navigate('/signup')}
    />
  )
}

// Blocks a page unless the person is logged in (and has the right role, if roles are given).
// Note: this only hides pages. Your Supabase security rules (RLS) still protect the data.
function RequireAuth({ roles, children }) {
  const [state, setState] = useState({ loading: true, session: null, role: null })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      let role = null
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        role = profile?.role || 'customer'   // no profile yet (e.g. new Google user) = customer
      }
      if (alive) setState({ loading: false, session: data.session, role })
    })()
    return () => { alive = false }
  }, [])

  if (state.loading) return <div style={{ minHeight: '100vh', background: '#050f22', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'sans-serif' }}>Loading...</div>
  if (!state.session) return <Navigate to="/login" replace />
  if (roles && !roles.includes(state.role)) return <Navigate to={homeFor(state.role)} replace />
  return children
}

function DashboardWrapper() {
  const navigate = useNavigate()
  return (
    <Dashboard
      onLogout={async () => {
        navigate('/login')
      }}
    />
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeWrapper />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/update-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<RequireAuth><DashboardWrapper /></RequireAuth>} />
      <Route path="/queue" element={<RequireAuth><CustomerQueue /></RequireAuth>} />
      <Route path="/services" element={<RequireAuth><Services /></RequireAuth>} />
      <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
      <Route path="/employee" element={<RequireAuth roles={['employee', 'owner']}><EmployeeDashboard /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth roles={['owner']}><AdminDashboard /></RequireAuth>} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App