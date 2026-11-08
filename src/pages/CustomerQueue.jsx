import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Car, ArrowRight, Check, Clock } from 'lucide-react'
import './CustomerQueue.css'

export default function CustomerQueue() {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [existingTicket, setExistingTicket] = useState(null) // Track if they are already in
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Get logged in user
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        checkExistingTicket(data.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Fetch services
    supabase.from('services').select('*').then(({ data, error }) => {
      if (!error && data) {
        setServices(data)
        if (data.length > 0) setSelectedService(data[0].id)
      }
    })
  }, [])

  async function checkExistingTicket(userId) {
    const { data } = await supabase
      .from('queue_tickets')
      .select('*')
      .eq('customer_id', userId)
      .in('status', ['waiting', 'washing'])
      .limit(1)
      .maybeSingle()

    if (data) {
      setExistingTicket(data)
    }
    setLoading(false)
  }

  async function joinQueue() {
    if (!user) return alert("Please log in first!")
    
    const { error } = await supabase
      .from('queue_tickets')
      .insert([{ 
        customer_id: user.id, 
        service_id: selectedService, 
        status: 'waiting' 
      }])

    if (error) {
      console.error(error)
      alert("Error joining queue: " + error.message)
    } else {
      navigate('/dashboard')
    }
  }

  const currentService = services.find(s => s.id === selectedService)

  if (loading) {
    return (
      <div className="queue-page">
        <div className="queue-page__overlay" />
        <div className="queue-card" style={{ textAlign: 'center' }}>Loading...</div>
      </div>
    )
  }

  // IF THEY ARE ALREADY IN THE QUEUE, SHOW THEM THIS SCREEN
  if (existingTicket) {
    return (
      <div className="queue-page">
        <div className="queue-page__overlay" />
        <div className="queue-card" style={{ textAlign: 'center' }}>
          <div className="queue-card__avatar" style={{ background: '#16a34a' }}>
            <Clock size={36} />
          </div>
          <h2>You are already in the queue!</h2>
          <p className="queue-card__subtitle">Your car is currently {existingTicket.status === 'waiting' ? 'waiting' : 'being washed'}.</p>
          
          <button 
            onClick={() => navigate('/dashboard')}
            className="queue-btn-primary"
            style={{ marginTop: '20px' }}
          >
            Track My Queue <ArrowRight size={20} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="queue-page">
      <div className="queue-page__overlay" />

      <div className="queue-card">
        
        <div className="queue-card__avatar">
          <Car size={36} />
        </div>

        <h2>Join the Queue</h2>
        <p className="queue-card__subtitle">Select a service to see the price and join.</p>
        
        <div className="queue-services">
          {services.length === 0 && (
            <p className="queue-empty">No services found. Check browser console (F12) for errors.</p>
          )}
          
          {services.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedService(s.id)}
              className={`queue-service-label ${selectedService === s.id ? 'is-selected' : ''}`}
            >
              <div className="queue-service-left">
                <div className="queue-radio">
                   {selectedService === s.id && <Check size={16} color="white" />}
                </div>
                <span className="queue-service-name">{s.name}</span>
              </div>
              <strong className="queue-service-price">R{s.price}</strong>
            </div>
          ))}
        </div>

        <button 
          onClick={joinQueue}
          disabled={!selectedService}
          className="queue-btn-primary"
        >
          Confirm & Join Queue {currentService ? `(R${currentService.price})` : ''} <ArrowRight size={20} />
        </button>
        
        <button 
          onClick={() => navigate('/dashboard')}
          className="queue-btn-cancel"
        >
          Cancel and return to Dashboard
        </button>
      </div>
    </div>
  )
}