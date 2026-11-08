import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Play, CheckCircle, Car, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './EmployeeDashboard.css'

export default function EmployeeDashboard() {
  const [queue, setQueue] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchQueue()
    const channel = supabase.channel('emp-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, () => fetchQueue())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchQueue() {
    // FETCHING WITHOUT THE PROFILE JOIN FIRST (To isolate the issue)
    const { data, error } = await supabase
      .from('queue_tickets')
      .select('*, services(name)')
      .in('status', ['waiting', 'washing'])
      .order('created_at', { ascending: true })
      
    if (error) {
      console.error("SUPABASE ERROR:", error)
    } else {
      console.log("RAW DATA FROM SUPABASE:", data)
      if (data) setQueue(data)
    }
  }

  async function updateStatus(ticketId, newStatus) {
    const updates = { status: newStatus }
    
    if (newStatus === 'washing') {
      const { data } = await supabase.auth.getUser()
      updates.assigned_employee = data?.user?.id
      updates.started_at = new Date()
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date()
    }

    await supabase
      .from('queue_tickets')
      .update(updates)
      .eq('id', ticketId)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const waitingCars = queue.filter(q => q.status === 'waiting')
  const washingCars = queue.filter(q => q.status === 'washing')

  return (
    <div className="emp-page">
      <div className="emp-container">
        
        <div className="emp-header">
          <div>
            <h1>Employee Dashboard</h1>
            <p>Manage the wash bay and update the queue.</p>
          </div>
          <button onClick={handleLogout} className="emp-logout-btn">
            <LogOut size={18} /> Logout
          </button>
        </div>

        <div className="emp-grid">
          {/* WAITING QUEUE */}
          <div className="emp-column">
            <div className="emp-column-header">
              <h2 className="waiting"><Car size={24} /> Waiting ({waitingCars.length})</h2>
            </div>
            <div className="emp-list-card">
              {waitingCars.map((ticket, index) => (
                <div key={ticket.id} className="emp-ticket">
                  <div className="emp-ticket-top">
                    <span className="emp-ticket-position">Position #{index + 1}</span>
                    <span className="emp-service-badge">{ticket.services?.name || 'Wash'}</span>
                  </div>
                  <p className="emp-ticket-customer">Ticket ID: {ticket.id}</p>
                  <button 
                    onClick={() => updateStatus(ticket.id, 'washing')}
                    className="emp-btn emp-btn-start"
                  >
                    <Play size={18} /> Start Wash
                  </button>
                </div>
              ))}
              {waitingCars.length === 0 && (
                <div className="emp-empty">
                  <Car size={48} opacity={0.2} />
                  <p>No cars waiting right now.</p>
                </div>
              )}
            </div>
          </div>

          {/* BEING WASHED */}
          <div className="emp-column">
            <div className="emp-column-header">
              <h2 className="washing"><CheckCircle size={24} /> Being Washed ({washingCars.length})</h2>
            </div>
            <div className="emp-list-card">
              {washingCars.map((ticket) => (
                <div key={ticket.id} className="emp-ticket is-washing">
                  <div className="emp-ticket-top">
                    <span className="emp-ticket-position">In Wash Bay</span>
                    <span className="emp-service-badge">{ticket.services?.name || 'Wash'}</span>
                  </div>
                  <p className="emp-ticket-customer">Ticket ID: {ticket.id}</p>
                  <button 
                    onClick={() => updateStatus(ticket.id, 'completed')}
                    className="emp-btn emp-btn-complete"
                  >
                    <CheckCircle size={18} /> Mark Completed
                  </button>
                </div>
              ))}
              {washingCars.length === 0 && (
                <div className="emp-empty">
                  <CheckCircle size={48} opacity={0.2} />
                  <p>No cars being washed.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}