import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { Download, CheckCircle, AlertTriangle, Gem, Sparkles, FileText, ShieldCheck, Disc, Calendar } from 'lucide-react';
import './index.css';

function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Target date: Sunday, June 28, 2026 at 12:00 PM
    const targetDate = new Date('2026-06-28T12:00:00');

    const timer = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="countdown-container">
      <div className="countdown-box">
        <span className="countdown-number">{String(timeLeft.days).padStart(2, '0')}</span>
        <span className="countdown-label">Días</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-box">
        <span className="countdown-number">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="countdown-label">Hrs</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-box">
        <span className="countdown-number">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="countdown-label">Min</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-box">
        <span className="countdown-number">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="countdown-label">Seg</span>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="app-container home-page">
      <header className="header" style={{ marginBottom: '2rem' }}>
        <h1 className="brand" style={{ fontSize: '5.5rem' }}>Comin</h1>
        <p style={{ fontSize: '1.5rem', marginTop: '-0.5rem', fontStyle: 'italic', fontFamily: 'serif', color: 'var(--color-gold-light)' }}>
          Una pieza para recordar
        </p>
      </header>

      <div className="home-content">
        <h2 className="home-title">EL GRAN SORTEO</h2>
        <p className="home-subtitle">Adquiere tu boleto y gana una joya exclusiva.</p>
        
        <Countdown />

      </div>
    </div>
  );
}

function Tickets() {
  const [tickets, setTickets] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successTicket, setSuccessTicket] = useState(null);

  const ticketRef = useRef(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticketNumber) => {
    if (tickets[ticketNumber]?.reserved) return;
    setSelectedTicket(ticketNumber);
    setShowModal(true);
    setError('');
    setName('');
    setWhatsapp('');
  };

  const handleReserve = async () => {
    if (!name.trim() || !whatsapp.trim()) {
      setError('Por favor llena todos los campos.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedTicket, name, whatsapp })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Hubo un error al reservar.');
        setIsSubmitting(false);
        return;
      }

      setTickets(prev => ({
        ...prev,
        [selectedTicket]: { reserved: true }
      }));
      setSuccessTicket({ number: selectedTicket, name, whatsapp });
      setShowModal(false);
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `Comin_Boleto_${successTicket.number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  if (loading) {
    return <div className="loading">Cargando boletos...</div>;
  }

  // If successfully reserved, show the ticket preview
  if (successTicket) {
    return (
      <div className="app-container">
        <header className="header">
          <h1 className="brand">Comin</h1>
          <p>¡Felicidades! Tu boleto está asegurado.</p>
        </header>

        <div className="ticket-preview-container">
          <div className="success-message">
            <CheckCircle size={48} />
          </div>
          <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>Descarga tu boleto y guárdalo para el sorteo.</p>

          <div className="ticket-design" ref={ticketRef}>
            <div className="ticket-design-main">
              <div className="ticket-header">
                <div className="ticket-title-group">
                  <h2 className="ticket-maintitle">SORTEO COMIN</h2>
                  <p className="ticket-subtitle">Una pieza para recordar</p>
                </div>
                <div className="ticket-price">
                  <span>Participación:</span>
                  <strong>$100</strong> <small>MXN</small>
                </div>
              </div>
              
              <div className="ticket-details-grid">
                <div className="detail-item">
                  <Gem size={14} className="detail-icon" />
                  <span>0.3 ct central + laterales</span>
                </div>
                <div className="detail-item">
                  <Sparkles size={14} className="detail-icon" />
                  <span>Color D · VVS1</span>
                </div>
                <div className="detail-item">
                  <FileText size={14} className="detail-icon" />
                  <span>Certificado incluido</span>
                </div>
                <div className="detail-item">
                  <ShieldCheck size={14} className="detail-icon" />
                  <span>Diamond tester pass</span>
                </div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <Disc size={14} className="detail-icon" />
                  <span>Plata 925 + Baño de oro blanco 18k</span>
                </div>
              </div>

              <div className="ticket-footer">
                <div className="ticket-date">
                  <Calendar size={14} /> Domingo 28 de junio · Anuncio del ganador
                </div>
                <div className="ticket-social">
                  <span>@</span> cominandco
                </div>
              </div>
            </div>

            <div className="ticket-design-stub">
              <div className="stub-brand">Comin</div>
              <div className="owner-name" style={{ marginBottom: '0.2rem' }}>{successTicket.name}</div>
              <div className="owner-phone" style={{ fontSize: '0.75rem', color: '#8a9990', marginBottom: '1.5rem' }}>{successTicket.whatsapp}</div>
              <div className="label">Boleto</div>
              <div className="number">{String(successTicket.number).padStart(3, '0')}</div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '300px', marginBottom: '1rem' }}>
            <Download size={20} />
            Descargar Boleto PNG
          </button>
          
          <Link to="/" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header" style={{ marginBottom: '1rem' }}>
        <h1 className="brand">Comin</h1>
        <p>Selecciona tu boleto para el sorteo</p>
      </header>
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline', fontSize: '0.9rem' }}>← Volver al inicio</Link>
      </div>

      <div className="tickets-grid">
        {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
          const isReserved = tickets[num]?.reserved;
          return (
            <button
              key={num}
              className={`ticket-btn ${isReserved ? 'reserved' : ''}`}
              disabled={isReserved}
              onClick={() => handleTicketClick(num)}
            >
              {String(num).padStart(3, '0')}
            </button>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Boleto #{String(selectedTicket).padStart(3, '0')}</h2>
            
            <p className="warning">
              <AlertTriangle size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
              <strong>¡Atención!</strong> Esta acción no se puede revertir. Al confirmar, este número será asignado a ti.
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div className="form-group">
              <label>WhatsApp</label>
              <input 
                type="text" 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)} 
                placeholder="Ej. +52 123 456 7890"
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleReserve}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar Boleto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Tombola from './Tombola';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/boletos" element={<Tickets />} />
        <Route path="/tombola" element={<Tombola />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
