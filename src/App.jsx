import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import WashFlowHome from './pages/WashFlowHome'
import Login from './pages/Login'
// Make sure this matches your actual file name exactly (Signup vs SignUp)
import Signup from './pages/Signup' 
import CustomerQueue from './pages/CustomerQueue'
import EmployeeDashboard from './pages/EmployeeDashboard'

function HomeWrapper() {
  const navigate = useNavigate()
  return (
    <WashFlowHome 
      onJoinQueue={() => navigate('/login')} 
      onTrackQueue={() => navigate('/queue')}
      onSignIn={() => navigate('/login')}
      onCreateAccount={() => navigate('/signup')} 
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
        <Route path="/queue" element={<CustomerQueue />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App