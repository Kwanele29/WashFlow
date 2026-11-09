import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import WashFlowHome from './pages/WashFlowHome'
import Login from './pages/Login'
import Signup from './pages/Signup' 
import CustomerQueue from './pages/CustomerQueue'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Account from './pages/Account'
import AdminDashboard from './pages/AdminDashboard' // <-- Added Admin Import

function HomeWrapper() {
  const navigate = useNavigate()
  return (
    <WashFlowHome 
      onJoinQueue={() => navigate('/login')} 
      onTrackQueue={() => navigate('/dashboard')}
      onSignIn={() => navigate('/login')}
      onCreateAccount={() => navigate('/signup')} 
    />
  )
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeWrapper />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<DashboardWrapper />} />
        <Route path="/queue" element={<CustomerQueue />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/services" element={<Services />} />
        <Route path="/account" element={<Account />} />
        
        {/* ADDED ADMIN ROUTE */}
        <Route path="/admin" element={<AdminDashboard />} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App