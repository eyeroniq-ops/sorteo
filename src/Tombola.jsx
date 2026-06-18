import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useCylinder, useSphere, useTrimesh } from '@react-three/cannon';
import { Environment, Text, ContactShadows, OrbitControls } from '@react-three/drei';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

const R = 4;
const w = 2 * R * Math.tan(Math.PI / 8) + 0.2;
const t = 0.2;
const L = 6;
const OFFSET_Y = 8; // Tombola original height

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
      api.position.set(0, 1000, 0);
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
      <meshStandardMaterial color="#ffffff" transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
      <mesh><boxGeometry args={[w, t, L]} /><meshBasicMaterial color="#d4af37" wireframe={true} transparent opacity={0.3} /></mesh>
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

// --------------------------------------------------------
// EPIC MACHINE: Funnels and 3 Tubes
// --------------------------------------------------------

function EpicMachine() {
  const glassMatProps = { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, color: "#ffffff" };
  const wireMatProps = { color: "#d4af37", wireframe: true, transparent: true, opacity: 0.15 };

  // 1. Main Funnel (Y=2 to Y=6)
  const mainFunnelGeo = useMemo(() => {
    // Top radius 8, bottom radius 2.5, height 4
    const geo = new THREE.CylinderGeometry(8, 2.5, 4, 32, 1, true);
    geo.translate(0, 4, 0); // Center=4 (Top=6, Bottom=2)
    geo.scale(-1, 1, 1); 
    return geo;
  }, []);

  const [mainFunnelRef] = useTrimesh(() => ({
    type: 'Static',
    args: [mainFunnelGeo.attributes.position.array, mainFunnelGeo.index.array],
    position: [0, 0, 0],
    friction: 0.1,
    restitution: 0.2
  }));

  // 2. Sub-Funnels (Y=0 to Y=2)
  const subFunnelGeo = useMemo(() => {
    // Top radius 2.2 (huge overlap to catch everything), bottom radius 0.8, height 2
    const geo = new THREE.CylinderGeometry(2.2, 0.8, 2, 32, 1, true);
    geo.translate(0, 1, 0); // Center=1 (Top=2, Bottom=0)
    geo.scale(-1, 1, 1);
    return geo;
  }, []);

  const subPosLeft = [-1.5, 0, 1];
  const subPosRight = [1.5, 0, 1];
  const subPosCenter = [0, 0, -1.5];

  const [subRefL] = useTrimesh(() => ({ type: 'Static', args: [subFunnelGeo.attributes.position.array, subFunnelGeo.index.array], position: subPosLeft, friction: 0.1 }));
  const [subRefR] = useTrimesh(() => ({ type: 'Static', args: [subFunnelGeo.attributes.position.array, subFunnelGeo.index.array], position: subPosRight, friction: 0.1 }));
  const [subRefC] = useTrimesh(() => ({ type: 'Static', args: [subFunnelGeo.attributes.position.array, subFunnelGeo.index.array], position: subPosCenter, friction: 0.1 }));

  // 3. Three Epic Tubes (Massive Spirals and Loops, perfectly isolated)
  const tubeGeo1 = useMemo(() => {
    // Curve 1: Double Spiral (Strictly Left side X <= -4)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.5, 0, 1),
      new THREE.Vector3(-1.5, -1, 1), // Straight drop for speed
      new THREE.Vector3(-4, -2.0, 9), // Enter Spiral (Center X=-8, Z=9, R=4)
      // Loop 1
      new THREE.Vector3(-8, -2.4, 13),
      new THREE.Vector3(-12, -2.8, 9),
      new THREE.Vector3(-8, -3.2, 5),
      new THREE.Vector3(-4, -3.6, 9),
      // Loop 2
      new THREE.Vector3(-8, -4.0, 13),
      new THREE.Vector3(-12, -4.4, 9),
      new THREE.Vector3(-8, -4.8, 5),
      new THREE.Vector3(-4, -5.2, 9),
      // Exit
      new THREE.Vector3(-6, -5.6, 18),
      new THREE.Vector3(-4, -6.0, 28) // Drop into basket
    ]);
    const geo = new THREE.TubeGeometry(curve, 300, 0.8, 16, false);
    geo.scale(-1, 1, 1);
    return geo;
  }, []);

  const tubeGeo2 = useMemo(() => {
    // Curve 2: Figure-8 (Strictly Right side X >= 4)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.5, 0, 1),
      new THREE.Vector3(1.5, -1, 1), // Straight drop for speed
      new THREE.Vector3(4, -2.0, 9), // Enter Top Loop (Center X=8, Z=9, R=4)
      // Top Loop
      new THREE.Vector3(8, -2.4, 5),
      new THREE.Vector3(12, -2.8, 9),
      new THREE.Vector3(8, -3.2, 13),
      // Crossover to Bottom Loop (Center X=8, Z=19, R=4)
      new THREE.Vector3(4, -3.6, 19),
      // Bottom Loop
      new THREE.Vector3(8, -4.0, 23),
      new THREE.Vector3(12, -4.4, 19),
      new THREE.Vector3(8, -4.8, 15),
      // Exit
      new THREE.Vector3(6, -5.2, 21),
      new THREE.Vector3(4, -6.0, 28) // Drop into basket
    ]);
    const geo = new THREE.TubeGeometry(curve, 300, 0.8, 16, false);
    geo.scale(-1, 1, 1);
    return geo;
  }, []);

  const tubeGeo3 = useMemo(() => {
    // Curve 3: Mega Slalom! (Strictly Center -2 <= X <= 2)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -1.5),
      new THREE.Vector3(0, -1, -1.5), // Straight drop for speed
      new THREE.Vector3(0, -1.5, 3),
      new THREE.Vector3(-2, -2.0, 6),
      new THREE.Vector3(0, -2.5, 9),
      new THREE.Vector3(2, -3.0, 12),
      new THREE.Vector3(0, -3.5, 15),
      new THREE.Vector3(-2, -4.0, 18),
      new THREE.Vector3(0, -4.5, 21),
      new THREE.Vector3(2, -5.0, 24),
      new THREE.Vector3(0, -5.5, 26),
      new THREE.Vector3(0, -6.0, 28) // Drop into basket
    ]);
    const geo = new THREE.TubeGeometry(curve, 300, 0.8, 16, false);
    geo.scale(-1, 1, 1);
    return geo;
  }, []);

  const [tubeRef1] = useTrimesh(() => ({ type: 'Static', args: [tubeGeo1.attributes.position.array, tubeGeo1.index.array], position: [0,0,0], friction: 0.05, restitution: 0.2 }));
  const [tubeRef2] = useTrimesh(() => ({ type: 'Static', args: [tubeGeo2.attributes.position.array, tubeGeo2.index.array], position: [0,0,0], friction: 0.05, restitution: 0.2 }));
  const [tubeRef3] = useTrimesh(() => ({ type: 'Static', args: [tubeGeo3.attributes.position.array, tubeGeo3.index.array], position: [0,0,0], friction: 0.05, restitution: 0.2 }));

  // 4. Grand Basket (Catching flying balls safely)
  // Tubes end at Z=28, Y=-6.
  // Basket floor at Y=-7. Bounds: Z from 20 to 36. X from -10 to 10.
  const [basketFloor] = useBox(() => ({ type: 'Static', args: [20, 0.5, 16], position: [0, -7.25, 28], friction: 0.8, restitution: 0.2 }));
  const [basketBack] = useBox(() => ({ type: 'Static', args: [20, 6, 0.5], position: [0, -4, 36], friction: 0.1 }));
  // Front wall lowered so it NEVER intersects the tubes! Top of wall is Y = -6. Tubes are at Y = -6, passing over perfectly.
  const [basketFront] = useBox(() => ({ type: 'Static', args: [20, 1, 0.5], position: [0, -6.5, 20], friction: 0.1 }));
  const [basketLeft] = useBox(() => ({ type: 'Static', args: [0.5, 6, 16], position: [-10, -4, 28], friction: 0.1 }));
  const [basketRight] = useBox(() => ({ type: 'Static', args: [0.5, 6, 16], position: [10, -4, 28], friction: 0.1 }));

  return (
    <>
      <mesh ref={mainFunnelRef} geometry={mainFunnelGeo}>
        <meshStandardMaterial {...glassMatProps} />
        <mesh geometry={mainFunnelGeo}><meshBasicMaterial {...wireMatProps} /></mesh>
      </mesh>

      <mesh ref={subRefL} geometry={subFunnelGeo} position={subPosLeft}>
        <meshStandardMaterial {...glassMatProps} />
        <mesh geometry={subFunnelGeo}><meshBasicMaterial {...wireMatProps} /></mesh>
      </mesh>
      <mesh ref={subRefR} geometry={subFunnelGeo} position={subPosRight}>
        <meshStandardMaterial {...glassMatProps} />
        <mesh geometry={subFunnelGeo}><meshBasicMaterial {...wireMatProps} /></mesh>
      </mesh>
      <mesh ref={subRefC} geometry={subFunnelGeo} position={subPosCenter}>
        <meshStandardMaterial {...glassMatProps} />
        <mesh geometry={subFunnelGeo}><meshBasicMaterial {...wireMatProps} /></mesh>
      </mesh>
      
      <mesh ref={tubeRef1} geometry={tubeGeo1}>
        <meshStandardMaterial {...glassMatProps} color="#4ade80" opacity={0.15} />
        <mesh geometry={tubeGeo1}><meshBasicMaterial {...wireMatProps} /></mesh>
      </mesh>
      <mesh ref={tubeRef2} geometry={tubeGeo2}>
        <meshStandardMaterial {...glassMatProps} color="#38bdf8" opacity={0.15} />
        <mesh geometry={tubeGeo2}><meshBasicMaterial {...wireMatProps} /></mesh>
      </mesh>
      <mesh ref={tubeRef3} geometry={tubeGeo3}>
        <meshStandardMaterial {...glassMatProps} color="#f43f5e" opacity={0.15} />
        <mesh geometry={tubeGeo3}><meshBasicMaterial {...wireMatProps} /></mesh>
      </mesh>
      
      <mesh ref={basketFloor}><boxGeometry args={[16, 0.5, 12]}/><meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} /></mesh>
      <mesh ref={basketBack}><boxGeometry args={[16, 4, 0.5]}/><meshStandardMaterial {...glassMatProps}/></mesh>
      <mesh ref={basketFront}><boxGeometry args={[16, 1, 0.5]}/><meshStandardMaterial {...glassMatProps}/></mesh>
      <mesh ref={basketLeft}><boxGeometry args={[0.5, 4, 12]}/><meshStandardMaterial {...glassMatProps}/></mesh>
      <mesh ref={basketRight}><boxGeometry args={[0.5, 4, 12]}/><meshStandardMaterial {...glassMatProps}/></mesh>
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
      // Grand Basket floor is at Y = -7. We trigger win if ball lands on the floor (Y < -6).
      if (p[2] > 20 && p[1] < -6 && !winnerAnnounced.current) {
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

        <EpicMachine />

        {reservedNumbers.map((num, i) => (
          <Ball key={num} num={num} index={i} onWin={onWin} winnerAnnounced={winnerAnnounced} />
        ))}
      </Physics>

      <ContactShadows position={[0, -9.5, 15]} opacity={0.6} scale={40} blur={2} far={15} />
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
      origin: { y: 0.7 }, 
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

      <Canvas shadows camera={{ position: [0, 15, 48], fov: 45 }}>
        <Scene reservedNumbers={reservedNumbers} isDrawing={isDrawing} isSpinning={isSpinning} onWin={triggerWin} />
        <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} target={[0, -2, 12]} />
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
