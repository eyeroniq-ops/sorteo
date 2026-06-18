import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import './index.css';

function createBallTexture(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  
  ctx.beginPath();
  ctx.arc(20, 20, 18, 0, 2 * Math.PI);
  
  const gradient = ctx.createRadialGradient(15, 15, 2, 20, 20, 20);
  gradient.addColorStop(0, '#f3e3a9');
  gradient.addColorStop(0.5, '#d4af37');
  gradient.addColorStop(1, '#aa8c2c');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#5a4a15';
  ctx.stroke();

  ctx.fillStyle = '#1b2614';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, 20, 20);

  return canvas.toDataURL();
}

export default function Tombola() {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const [winner, setWinner] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);

  // Use a ref to mutate isDoorOpen inside the matter.js loop without re-running effects
  const doorState = useRef({ open: false });

  useEffect(() => {
    let engine;
    let render;
    let runner;

    const initPhysics = async () => {
      // 1. Fetch tickets
      const res = await fetch('/api/tickets');
      const data = await res.json();
      
      const reservedNumbers = Object.keys(data).map(Number).filter(n => data[n].reserved);
      
      // Inject fake 101-200 tickets
      for (let i = 101; i <= 200; i++) {
        reservedNumbers.push(i);
      }

      setParticipantsCount(reservedNumbers.length);

      // 2. Setup Matter.js
      const { Engine, Render, Runner, World, Bodies, Events, Body, Composite } = Matter;

      engine = Engine.create();
      engineRef.current = engine;

      const width = 800;
      const height = 700;

      render = Render.create({
        element: sceneRef.current,
        engine: engine,
        options: {
          width,
          height,
          wireframes: false,
          background: 'transparent'
        }
      });
      renderRef.current = render;

      // Drum parameters
      const cx = width / 2;
      const cy = 250;
      const r = 180;
      const segments = 36;
      const drumBodies = [];

      // Create Drum
      for (let i = 0; i < segments; i++) {
        const l = (2 * Math.PI * r) / segments + 6;
        const part = Bodies.rectangle(cx, cy - r, l, 15, { 
          isStatic: true, 
          friction: 0.05,
          restitution: 0.2,
          render: { fillStyle: 'rgba(212, 175, 55, 0.4)', strokeStyle: '#d4af37', lineWidth: 1 } 
        });
        
        drumBodies.push({ 
          body: part, 
          offsetAngle: (i / segments) * Math.PI * 2, 
          isDoor: i === 0 || i === 1 // Make hole 2 segments wide
        });
      }

      World.add(engine.world, drumBodies.map(d => d.body));

      // Funnel & Channel
      const funnelLeft = Bodies.rectangle(cx - 120, 520, 250, 20, { isStatic: true, angle: Math.PI / 5, render: { fillStyle: '#2a3b1d' } });
      const funnelRight = Bodies.rectangle(cx + 120, 520, 250, 20, { isStatic: true, angle: -Math.PI / 5, render: { fillStyle: '#2a3b1d' } });
      
      const channelLeft = Bodies.rectangle(cx - 30, 620, 20, 150, { isStatic: true, render: { fillStyle: '#2a3b1d' } });
      const channelRight = Bodies.rectangle(cx + 30, 620, 20, 150, { isStatic: true, render: { fillStyle: '#2a3b1d' } });

      const sensor = Bodies.rectangle(cx, 680, 50, 20, { isStatic: true, isSensor: true, render: { visible: false } });

      World.add(engine.world, [funnelLeft, funnelRight, channelLeft, channelRight, sensor]);

      // Add balls
      const balls = reservedNumbers.map(num => {
        const tex = createBallTexture(num);
        return Bodies.circle(cx + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 100, 18, {
          restitution: 0.6,
          friction: 0.005,
          density: 0.04,
          label: `ball-${num}`,
          render: {
            sprite: {
              texture: tex,
              xScale: 1,
              yScale: 1
            }
          }
        });
      });

      World.add(engine.world, balls);

      // Animation Loop
      let drumAngle = 0;
      Events.on(engine, 'beforeUpdate', () => {
        drumAngle += 0.02; // Rotation speed
        drumBodies.forEach(d => {
          if (d.isDoor && doorState.current.open) {
            Body.setPosition(d.body, { x: -1000, y: -1000 });
            return;
          }
          const a = drumAngle + d.offsetAngle;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          Body.setPosition(d.body, { x: px, y: py });
          Body.setAngle(d.body, a + Math.PI/2);
        });
      });

      // Collision Event for Winner
      Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;

          if (bodyA === sensor || bodyB === sensor) {
            const ball = bodyA === sensor ? bodyB : bodyA;
            if (ball.label.startsWith('ball-') && !doorState.current.winnerAnnounced) {
              doorState.current.winnerAnnounced = true; // Prevent multiple winners
              const winNum = ball.label.split('-')[1];
              triggerWin(winNum);
            }
          }
        });
      });

      Render.run(render);
      runner = Runner.create();
      Runner.run(runner, engine);
    };

    initPhysics();

    return () => {
      if (render) {
        Matter.Render.stop(render);
        render.canvas.remove();
      }
      if (runner) Matter.Runner.stop(runner);
      if (engine) Matter.Engine.clear(engine);
    };
  }, []);

  const triggerWin = (winNum) => {
    setWinner(winNum);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#aa8c2c', '#f3e3a9', '#ffffff']
    });
  };

  const handleDraw = () => {
    setIsDrawing(true);
    // After 3 seconds of mixing, open the door
    setTimeout(() => {
      doorState.current.open = true;
    }, 3000);
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header className="header" style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <h1 className="brand" style={{ fontSize: '3rem' }}>Sorteo En Vivo</h1>
        <p style={{ color: 'var(--color-gold)' }}>{participantsCount} Boletos Participando (Prueba 101-200)</p>
      </header>

      {winner && (
        <div className="winner-announcement" style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(24, 34, 24, 0.95)',
          padding: '3rem',
          borderRadius: '20px',
          border: '4px solid var(--color-gold)',
          zIndex: 10,
          textAlign: 'center',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.4)',
          animation: 'slideUp 0.5s ease-out'
        }}>
          <h2 style={{ color: 'var(--color-text-muted)', fontSize: '1.5rem', marginBottom: '1rem' }}>¡TENEMOS GANADOR!</h2>
          <div style={{ fontSize: '5rem', color: 'var(--color-gold)', fontFamily: 'serif', fontWeight: 'bold' }}>
            Boleto #{winner}
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '2rem' }}>
            Nuevo Sorteo
          </button>
        </div>
      )}

      <div style={{ position: 'relative', width: '800px', height: '700px' }}>
        <div ref={sceneRef} style={{ width: '100%', height: '100%' }} />
        
        {!isDrawing && !winner && (
          <div style={{ position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)' }}>
            <button className="btn btn-primary" onClick={handleDraw} style={{ fontSize: '1.5rem', padding: '1rem 3rem' }}>
              ¡Sacar Ganador!
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/boletos" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}>
          Volver a Boletos
        </Link>
      </div>
    </div>
  );
}
