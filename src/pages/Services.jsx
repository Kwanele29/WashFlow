import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle } from "lucide-react";
import "./Services.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [inQueue, setInQueue] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Fetch services
    supabase.from('services').select('*').then(({ data }) => {
      if (data) setServices(data);
    });

    // 2. Check if user is already in the queue
    async function checkQueueStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('queue_tickets')
          .select('id')
          .eq('customer_id', user.id)
          .in('status', ['waiting', 'washing'])
          .limit(1);
        
        if (data && data.length > 0) {
          setInQueue(true);
        }
      }
    }
    checkQueueStatus();
  }, []);

  return (
    <div className="services-page">
      <div className="services-container">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        
        <h1 className="services-title">Our Services</h1>
        <p className="services-subtitle">Choose the perfect wash for your car.</p>

        <div className="services-grid">
          {services.map(service => (
            <div key={service.id} className="service-card">
              <h2>{service.name}</h2>
              <div className="service-card-details">
                <span className="service-price">R{service.price}</span>
                <span className="service-time"><Clock size={16} /> ~{service.est_minutes} min</span>
              </div>
              
              {/* BUTTON LOGIC */}
              {inQueue ? (
                <button 
                  className="service-book-btn" 
                  style={{ background: '#16a34a', cursor: 'not-allowed', opacity: 0.8 }}
                  disabled
                >
                  <CheckCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }}/> 
                  Already in Queue
                </button>
              ) : (
                <button 
                  className="service-book-btn" 
                  onClick={() => navigate(`/queue?service=${service.id}`)}
                >
                  Select & Join Queue
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}