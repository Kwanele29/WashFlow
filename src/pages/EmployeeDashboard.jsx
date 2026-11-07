import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function EmployeeDashboard() {
  const [queue, setQueue] = useState([])

  useEffect(() => {
    fetchQueue()
    const channel = supabase.channel('emp-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, () => fetchQueue())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchQueue() {
    const { data } = await supabase
      .from('queue_tickets')
      .select('*, services(name)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
    if (data) setQueue(data)
  }

  async function startWash(ticketId) {
    const mockEmployeeId = '11111111-1111-1111-1111-111111111111'
    await supabase
      .from('queue_tickets')
      .update({ status: 'washing', assigned_employee: mockEmployeeId, started_at: new Date() })
      .eq('id', ticketId)
  }

  return (
    <div style={{ padding: '50px', background: '#071428', minHeight: '100vh', color: 'white' }}>
      <h2>Employee Dashboard - Waiting Cars</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        {queue.map((ticket, index) => (
          <div key={ticket.id} style={{ border: '1px solid #1a3b73', background: '#0a1d3b', padding: '20px', borderRadius: '10px', width: '220px' }}>
            <h3>Ticket: #{index + 1}</h3>
            <p>Service: {ticket.services?.name}</p>
            <button 
              onClick={() => startWash(ticket.id)}
              style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', width: '100%', cursor: 'pointer', marginTop: '10px' }}
            >
              Start Wash
            </button>
          </div>
        ))}
      </div>
      {queue.length === 0 && <p style={{ marginTop: '20px' }}>No cars waiting right now.</p>}
    </div>
  )
}