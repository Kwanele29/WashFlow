import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function CustomerQueue() {
  const [queue, setQueue] = useState([])
  const [myTicket, setMyTicket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQueue()
    const channel = supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, () => {
        fetchQueue()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchQueue() {
    const { data, error } = await supabase
      .from('queue_tickets')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
    
    if (!error) setQueue(data || [])
    setLoading(false)
  }

  async function joinQueue() {
    const mockCustomerId = '00000000-0000-0000-0000-000000000000' 
    
    const { data, error } = await supabase
      .from('queue_tickets')
      .insert([{ customer_id: mockCustomerId, service_id: 1, status: 'waiting' }])
      .select()

    if (error) console.error(error)
    else setMyTicket(data[0])
  }

  const myPosition = myTicket ? queue.findIndex(q => q.id === myTicket.id) + 1 : null
  const carsAhead = myPosition ? myPosition - 1 : 0

  if (loading) return <div style={{ color: 'white', padding: '50px', background: '#071428', minHeight: '100vh' }}>Loading...</div>

  return (
    <div style={{ padding: '50px', textAlign: 'center', background: '#071428', minHeight: '100vh', color: 'white' }}>
      <h2>Live Queue Status</h2>
      
      {!myTicket ? (
        <button onClick={joinQueue} style={{ padding: '15px 30px', fontSize: '1.2rem', background: '#0b63f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' }}>
          Join Queue Now
        </button>
      ) : (
        <div style={{ border: '1px solid #1a3b73', background: '#0a1d3b', padding: '30px', borderRadius: '15px', display: 'inline-block', marginTop: '20px' }}>
          <h3>Your Queue Number</h3>
          <h1 style={{ fontSize: '5rem', color: '#19a7ff', margin: '0' }}>#{myPosition}</h1>
          <p><strong>Cars Ahead:</strong> {carsAhead}</p>
          <p><strong>Estimated Wait:</strong> ~{carsAhead * 15} min</p>
        </div>
      )}
    </div>
  )
}