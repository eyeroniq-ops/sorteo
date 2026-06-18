import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useCylinder, useSphere } from '@react-three/cannon';
import { Environment, Text, ContactShadows, OrbitControls } from '@react-three/drei';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

const R = 4;
const w = 2 * R * Math.tan(Math.PI / 8) + 0.1;
const t = 0.2;
const L = 6;

function DrumPanel({ index, isDoor, isDrawing, drumAngle }) {
  const initAngle = (index / 8) * Math.PI * 2;
  const [ref, api] = useBox(() => ({ 
    type: 'Kinematic', 
    args: [w, t, L],
    collisionFilterGroup: 1,
    collisionFilterMask: 1
  }));

  useFrame(() => {
    if (isDoor && isDrawing) {
      api.position.set(0, 1000, 0); // Move away
      return;
    }
    const currentAngle = drumAngle.current + initAngle;
    const x = Math.cos(currentAngle) * R;
    const y = Math.sin(currentAngle) * R;
    api.position.set(x, y, 0);
    api.rotation.set(0, 0, currentAngle + Math.PI / 2);
  });

  if (isDoor && isDrawing) return null;

  return (
    <mesh ref={ref}>
      <boxGeometry args={[w, t, L]} />
      <meshPhysicalMaterial 
        transparent 
        transmission={0.95} 
        roughness={0.05} 
        thickness={0.5} 
        ior={1.5} 
        color="#ffffff" 
      />
    </mesh>
  );
}

function DrumCaps({ drumAngle }) {
  const [frontRef, frontApi] = useCylinder(() => ({ type: 'Kinematic', args: [R + 0.2, R + 0.2, 0.2, 16], position: [0, 0, L / 2], rotation: [Math.PI/2, 0, 0] }));
  const [backRef, backApi] = useCylinder(() => ({ type: 'Kinematic', args: [R + 0.2, R + 0.2, 0.2, 16], position: [0, 0, -L / 2], rotation: [Math.PI/2, 0, 0] }));

  useFrame(() => {
    frontApi.rotation.set(Math.PI/2, drumAngle.current, 0);
    backApi.rotation.set(Math.PI/2, drumAngle.current, 0);
  });

  const material = <meshPhysicalMaterial transparent transmission={0.9} roughness={0.1} thickness={0.5} ior={1.5} color="#ffffff" />;
  
  return (
    <>
      <mesh ref={frontRef}><cylinderGeometry args={[R + 0.2, R + 0.2, 0.2, 16]} />{material}</mesh>
      <mesh ref={backRef}><cylinderGeometry args={[R + 0.2, R + 0.2, 0.2, 16]} />{material}</mesh>
    </>
  );
}

function Funnel() {
  // Funnel ramps
  const [leftRef] = useBox(() => ({ type: 'Static', args: [10, 0.5, 8], position: [-4, -6, 0], rotation: [0, 0, -Math.PI / 4] }));
  const [rightRef] = useBox(() => ({ type: 'Static', args: [10, 0.5, 8], position: [4, -6, 0], rotation: [0, 0, Math.PI / 4] }));
  
  // Vertical Chute (x= -0.6 to 0.6)
  const [cLeft] = useBox(() => ({ type: 'Static', args: [0.5, 8, 4], position: [-0.85, -10, 0] }));
  const [cRight] = useBox(() => ({ type: 'Static', args: [0.5, 8, 4], position: [0.85, -10, 0] }));
  const [cFront] = useBox(() => ({ type: 'Static', args: [2.2, 8, 0.5], position: [0, -10, 2] }));
  const [cBack] = useBox(() => ({ type: 'Static', args: [2.2, 8, 0.5], position: [0, -10, -2] }));

  const material = <meshPhysicalMaterial transparent transmission={0.9} roughness={0.1} color="#182218" />;

  return (
    <>
      <mesh ref={leftRef}><boxGeometry args={[10, 0.5, 8]}/>{material}</mesh>
      <mesh ref={rightRef}><boxGeometry args={[10, 0.5, 8]}/>{material}</mesh>
      <mesh ref={cLeft}><boxGeometry args={[0.5, 8, 4]}/>{material}</mesh>
      <mesh ref={cRight}><boxGeometry args={[0.5, 8, 4]}/>{material}</mesh>
      <mesh ref={cFront}><boxGeometry args={[2.2, 8, 0.5]}/>{material}</mesh>
      <mesh ref={cBack}><boxGeometry args={[2.2, 8, 0.5]}/>{material}</mesh>
    </>
  );
}

function Ball({ num, index, onWin, winnerAnnounced }) {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    args: [0.4],
    position: [(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4],
    restitution: 0.6,
    friction: 0.1,
  }));

  useEffect(() => {
    const unsub = api.position.subscribe(p => {
      // Check if it fell down the chute
      if (p[1] < -12 && !winnerAnnounced.current) {
        winnerAnnounced.current = true;
        onWin(num);
      }
    });
    return unsub;
  }, [api.position, num, onWin, winnerAnnounced]);

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.15} />
      <Text position={[0, 0, 0.41]} fontSize={0.3} color="#182218" fontWeight="bold">
        {num}
      </Text>
      <Text position={[0, 0, -0.41]} rotation={[0, Math.PI, 0]} fontSize={0.3} color="#182218" fontWeight="bold">
        {num}
      </Text>
    </mesh>
  );
}

function Scene({ reservedNumbers, isDrawing, onWin }) {
  const drumAngle = useRef(0);
  const winnerAnnounced = useRef(false);

  useFrame((state, delta) => {
    drumAngle.current += delta * 1.5; // Rotation speed
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />

      <Physics gravity={[0, -9.81, 0]}>
        {/* Drum Panels */}
        {Array.from({ length: 8 }).map((_, i) => (
          <DrumPanel key={i} index={i} isDoor={i === 0} isDrawing={isDrawing} drumAngle={drumAngle} />
        ))}
        <DrumCaps drumAngle={drumAngle} />

        <Funnel />

        {/* Balls */}
        {reservedNumbers.map((num, i) => (
          <Ball key={num} num={num} index={i} onWin={onWin} winnerAnnounced={winnerAnnounced} />
        ))}
      </Physics>

      <ContactShadows position={[0, -14, 0]} opacity={0.5} scale={20} blur={2} far={15} />
    </>
  );
}

export default function Tombola() {
  const [reservedNumbers, setReservedNumbers] = useState([]);
  const [winner, setWinner] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      const numbers = Object.keys(data).map(Number).filter(n => data[n].reserved);
      
      // Inject fake 101-200
      for (let i = 101; i <= 200; i++) {
        numbers.push(i);
      }
      setReservedNumbers(numbers);
    };
    fetchTickets();
  }, []);

  const triggerWin = (winNum) => {
    setWinner(winNum);
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#aa8c2c', '#f3e3a9', '#ffffff']
    });
  };

  const handleDraw = () => {
    // 1. Give it 3 seconds of high speed spinning before opening the door
    setTimeout(() => {
      setIsDrawing(true);
    }, 3000);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0f0a', position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ position: 'absolute', top: '2rem', left: '0', width: '100%', textAlign: 'center', zIndex: 10 }}>
        <h1 className="brand" style={{ fontSize: '3rem', margin: 0 }}>Sorteo En Vivo</h1>
        <p style={{ color: 'var(--color-gold)', margin: 0 }}>{reservedNumbers.length} Boletos Participando</p>
      </div>

      <Canvas shadows camera={{ position: [0, 2, 16], fov: 45 }}>
        <Scene reservedNumbers={reservedNumbers} isDrawing={isDrawing} onWin={triggerWin} />
        <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} />
      </Canvas>

      {!isDrawing && !winner && reservedNumbers.length > 0 && (
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <button className="btn btn-primary" onClick={handleDraw} style={{ fontSize: '1.5rem', padding: '1rem 4rem' }}>
            ¡Sacar Ganador!
          </button>
        </div>
      )}

      {winner && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(20, 28, 20, 0.95)',
          padding: '4rem 6rem',
          borderRadius: '24px',
          border: '4px solid var(--color-gold)',
          zIndex: 20,
          textAlign: 'center',
          boxShadow: '0 0 80px rgba(212, 175, 55, 0.4)',
          animation: 'slideUp 0.5s ease-out'
        }}>
          <h2 style={{ color: 'var(--color-text-muted)', fontSize: '1.5rem', letterSpacing: '4px', marginBottom: '1rem' }}>¡TENEMOS GANADOR!</h2>
          <div style={{ fontSize: '6rem', color: 'var(--color-gold)', fontFamily: 'serif', fontWeight: 'bold', lineHeight: 1 }}>
            Boleto #{winner}
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '3rem' }}>
            Nuevo Sorteo
          </button>
        </div>
      )}

      <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10 }}>
        <Link to="/boletos" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', borderBottom: '1px solid var(--color-text-muted)' }}>
          ← Volver a Boletos
        </Link>
      </div>
    </div>
  );
}
