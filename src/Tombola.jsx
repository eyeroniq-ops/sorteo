import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useCylinder, useSphere } from '@react-three/cannon';
import { Environment, Text, ContactShadows, OrbitControls } from '@react-three/drei';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

const R = 4;
const w = 2 * R * Math.tan(Math.PI / 8) + 0.2;
const t = 0.2;
const L = 6;
const OFFSET_Y = 8; // Elevamos la tombola

function DrumPanel({ index, isDoor, isDrawing, drumAngle }) {
  const initAngle = (index / 8) * Math.PI * 2;
  const initX = Math.cos(initAngle) * R;
  const initY = Math.sin(initAngle) * R;
  const initRotZ = initAngle + Math.PI / 2;

  const [ref, api] = useBox(() => ({ 
    type: 'Kinematic', 
    args: [w, t, L],
    position: [initX, initY + OFFSET_Y, 0],
    rotation: [0, 0, initRotZ],
    collisionFilterGroup: 1,
    collisionFilterMask: 1,
    friction: 0.8,
    restitution: 0.2
  }));

  useFrame(() => {
    if (isDoor && isDrawing) {
      api.position.set(0, 1000, 0); // Move away
      return;
    }
    const currentAngle = drumAngle.current + initAngle;
    const x = Math.cos(currentAngle) * R;
    const y = Math.sin(currentAngle) * R;
    api.position.set(x, y + OFFSET_Y, 0);
    api.rotation.set(0, 0, currentAngle + Math.PI / 2);
  });

  if (isDoor && isDrawing) return null;

  return (
    <mesh ref={ref}>
      <boxGeometry args={[w, t, L]} />
      <meshStandardMaterial 
        color="#ffffff" 
        transparent 
        opacity={0.15} 
        depthWrite={false}
        side={THREE.DoubleSide}
      />
      <mesh>
        <boxGeometry args={[w, t, L]} />
        <meshBasicMaterial color="#d4af37" wireframe={true} transparent opacity={0.3} />
      </mesh>
    </mesh>
  );
}

function DrumCaps({ drumAngle }) {
  const initFrontZ = L / 2;
  const initBackZ = -L / 2;

  const [frontRef, frontApi] = useCylinder(() => ({ type: 'Kinematic', args: [R, R, 0.2, 8], position: [0, OFFSET_Y, initFrontZ], rotation: [Math.PI/2, 0, 0], friction: 0.8, restitution: 0.2 }));
  const [backRef, backApi] = useCylinder(() => ({ type: 'Kinematic', args: [R, R, 0.2, 8], position: [0, OFFSET_Y, initBackZ], rotation: [Math.PI/2, 0, 0], friction: 0.8, restitution: 0.2 }));

  useFrame(() => {
    frontApi.rotation.set(Math.PI/2, drumAngle.current - Math.PI/8, 0);
    backApi.rotation.set(Math.PI/2, drumAngle.current - Math.PI/8, 0);
  });

  const materialProps = { color: "#ffffff", transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide };
  
  return (
    <>
      <mesh ref={frontRef}>
        <cylinderGeometry args={[R, R, 0.2, 8]} />
        <meshStandardMaterial {...materialProps} />
        <mesh><cylinderGeometry args={[R, R, 0.2, 8]} /><meshBasicMaterial color="#d4af37" wireframe={true} transparent opacity={0.4} /></mesh>
      </mesh>
      <mesh ref={backRef}>
        <cylinderGeometry args={[R, R, 0.2, 8]} />
        <meshStandardMaterial {...materialProps} />
        <mesh><cylinderGeometry args={[R, R, 0.2, 8]} /><meshBasicMaterial color="#d4af37" wireframe={true} transparent opacity={0.4} /></mesh>
      </mesh>
    </>
  );
}

function FunnelAndSlide() {
  const bottomY = OFFSET_Y - 5; // Y = 3

  // Funnel (Pirámide invertida)
  const [leftRef] = useBox(() => ({ type: 'Static', args: [10, 0.5, 10], position: [-4.2, bottomY + 2, 0], rotation: [0, 0, -Math.PI / 4], friction: 0.2 }));
  const [rightRef] = useBox(() => ({ type: 'Static', args: [10, 0.5, 10], position: [4.2, bottomY + 2, 0], rotation: [0, 0, Math.PI / 4], friction: 0.2 }));
  const [backRef] = useBox(() => ({ type: 'Static', args: [10, 0.5, 10], position: [0, bottomY + 2, -4.2], rotation: [Math.PI / 4, 0, 0], friction: 0.2 }));
  const [frontRef] = useBox(() => ({ type: 'Static', args: [10, 0.5, 10], position: [0, bottomY + 2, 4.2], rotation: [-Math.PI / 4, 0, 0], friction: 0.2 }));

  // Slide (Tobogán de cristal)
  const length = 16;
  const rotX = Math.PI / 6; // 30 degrees down
  
  const [floorRef] = useBox(() => ({ type: 'Static', args: [2.5, 0.5, length], position: [0, bottomY - 3, 6], rotation: [rotX, 0, 0], friction: 0.2 }));
  const [leftWall] = useBox(() => ({ type: 'Static', args: [0.5, 1.5, length], position: [-1.25, bottomY - 2.5, 6], rotation: [rotX, 0, 0], friction: 0.1 }));
  const [rightWall] = useBox(() => ({ type: 'Static', args: [0.5, 1.5, length], position: [1.25, bottomY - 2.5, 6], rotation: [rotX, 0, 0], friction: 0.1 }));

  // Pedestal del ganador al final del tobogán
  const [pedestalFloor] = useBox(() => ({ type: 'Static', args: [3, 0.5, 3], position: [0, bottomY - 7, 13], friction: 0.8, restitution: 0.1 }));
  const [pedestalBack] = useBox(() => ({ type: 'Static', args: [3, 3, 0.5], position: [0, bottomY - 6, 14.5], friction: 0.1 }));
  const [pedestalLeft] = useBox(() => ({ type: 'Static', args: [0.5, 3, 3], position: [-1.5, bottomY - 6, 13], friction: 0.1 }));
  const [pedestalRight] = useBox(() => ({ type: 'Static', args: [0.5, 3, 3], position: [1.5, bottomY - 6, 13], friction: 0.1 }));

  const glassMatProps = { transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, color: "#ffffff" };
  const wireMatProps = { color: "#d4af37", wireframe: true, transparent: true, opacity: 0.4 };

  return (
    <>
      <mesh ref={leftRef}><boxGeometry args={[10, 0.5, 10]}/><meshStandardMaterial {...glassMatProps}/><mesh><boxGeometry args={[10, 0.5, 10]}/><meshBasicMaterial {...wireMatProps} /></mesh></mesh>
      <mesh ref={rightRef}><boxGeometry args={[10, 0.5, 10]}/><meshStandardMaterial {...glassMatProps}/><mesh><boxGeometry args={[10, 0.5, 10]}/><meshBasicMaterial {...wireMatProps} /></mesh></mesh>
      <mesh ref={backRef}><boxGeometry args={[10, 0.5, 10]}/><meshStandardMaterial {...glassMatProps}/><mesh><boxGeometry args={[10, 0.5, 10]}/><meshBasicMaterial {...wireMatProps} /></mesh></mesh>
      <mesh ref={frontRef}><boxGeometry args={[10, 0.5, 10]}/><meshStandardMaterial {...glassMatProps}/><mesh><boxGeometry args={[10, 0.5, 10]}/><meshBasicMaterial {...wireMatProps} /></mesh></mesh>
      
      <mesh ref={floorRef}><boxGeometry args={[2.5, 0.5, length]}/><meshStandardMaterial {...glassMatProps} color="#4ade80" opacity={0.1}/><mesh><boxGeometry args={[2.5, 0.5, length]}/><meshBasicMaterial {...wireMatProps} /></mesh></mesh>
      <mesh ref={leftWall}><boxGeometry args={[0.5, 1.5, length]}/><meshStandardMaterial {...glassMatProps}/><mesh><boxGeometry args={[0.5, 1.5, length]}/><meshBasicMaterial {...wireMatProps} /></mesh></mesh>
      <mesh ref={rightWall}><boxGeometry args={[0.5, 1.5, length]}/><meshStandardMaterial {...glassMatProps}/><mesh><boxGeometry args={[0.5, 1.5, length]}/><meshBasicMaterial {...wireMatProps} /></mesh></mesh>
      
      <mesh ref={pedestalFloor}><boxGeometry args={[3, 0.5, 3]}/><meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} /></mesh>
      <mesh ref={pedestalBack}><boxGeometry args={[3, 3, 0.5]}/><meshStandardMaterial {...glassMatProps}/></mesh>
      <mesh ref={pedestalLeft}><boxGeometry args={[0.5, 3, 3]}/><meshStandardMaterial {...glassMatProps}/></mesh>
      <mesh ref={pedestalRight}><boxGeometry args={[0.5, 3, 3]}/><meshStandardMaterial {...glassMatProps}/></mesh>
    </>
  );
}

function Ball({ num, index, onWin, winnerAnnounced }) {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    args: [0.4],
    position: [(Math.random() - 0.5) * 3, OFFSET_Y + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4],
    restitution: 0.4,
    friction: 0.8,
  }));

  useEffect(() => {
    const unsub = api.position.subscribe(p => {
      // Check if it reached the pedestal (Z > 11 and Y < 0)
      if (p[2] > 11 && p[1] < 0 && !winnerAnnounced.current) {
        winnerAnnounced.current = true;
        onWin(num);
      }
    });
    return unsub;
  }, [api.position, num, onWin, winnerAnnounced]);

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.2} />
      <Text position={[0, 0, 0.41]} fontSize={0.3} color="#182218" fontWeight="bold" material-depthWrite={false}>
        {num}
      </Text>
      <Text position={[0, 0, -0.41]} rotation={[0, Math.PI, 0]} fontSize={0.3} color="#182218" fontWeight="bold" material-depthWrite={false}>
        {num}
      </Text>
    </mesh>
  );
}

function Scene({ reservedNumbers, isDrawing, isSpinning, onWin }) {
  const drumAngle = useRef(0);
  const winnerAnnounced = useRef(false);

  useFrame((state, delta) => {
    const speed = isSpinning && !isDrawing ? 6 : 1.5;
    drumAngle.current += delta * speed;
  });

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Physics gravity={[0, -15, 0]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <DrumPanel key={i} index={i} isDoor={i === 0} isDrawing={isDrawing} drumAngle={drumAngle} />
        ))}
        <DrumCaps drumAngle={drumAngle} />

        <FunnelAndSlide />

        {reservedNumbers.map((num, i) => (
          <Ball key={num} num={num} index={i} onWin={onWin} winnerAnnounced={winnerAnnounced} />
        ))}
      </Physics>

      <ContactShadows position={[0, -5, 10]} opacity={0.6} scale={30} blur={2} far={15} />
    </>
  );
}

export default function Tombola() {
  const [reservedNumbers, setReservedNumbers] = useState([]);
  const [winner, setWinner] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      const numbers = Object.keys(data).map(Number).filter(n => data[n].reserved);
      
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
      origin: { y: 0.7 }, // Confetti slightly lower since camera is high
      colors: ['#d4af37', '#aa8c2c', '#f3e3a9', '#ffffff']
    });
  };

  const handleDraw = () => {
    setIsSpinning(true);
    setTimeout(() => {
      setIsDrawing(true);
    }, 4000);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0f0a', position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ position: 'absolute', top: '2rem', left: '0', width: '100%', textAlign: 'center', zIndex: 10 }}>
        <h1 className="brand" style={{ fontSize: '3rem', margin: 0 }}>Sorteo En Vivo</h1>
        <p style={{ color: 'var(--color-gold)', margin: 0 }}>{reservedNumbers.length} Boletos Participando</p>
      </div>

      <Canvas shadows camera={{ position: [0, 8, 30], fov: 45 }}>
        <Scene reservedNumbers={reservedNumbers} isDrawing={isDrawing} isSpinning={isSpinning} onWin={triggerWin} />
        <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} target={[0, 2, 5]} />
      </Canvas>

      {!isSpinning && !winner && reservedNumbers.length > 0 && (
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <button className="btn btn-primary" onClick={handleDraw} style={{ fontSize: '1.5rem', padding: '1rem 4rem' }}>
            ¡Sacar Ganador!
          </button>
        </div>
      )}

      {isSpinning && !isDrawing && !winner && (
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <h2 style={{ color: 'var(--color-gold)', letterSpacing: '4px', fontSize: '2rem', animation: 'fadeIn 1s infinite alternate' }}>
            Mezclando boletos...
          </h2>
        </div>
      )}

      {winner && (
        <div style={{
          position: 'absolute',
          top: '40%',
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
