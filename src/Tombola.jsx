import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useBox, useCylinder, useSphere, useTrimesh } from '@react-three/cannon';
import { Environment, Text, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import confetti from 'canvas-confetti';

const BOLETOS = Array.from({ length: 100 }, (_, i) => i + 1);
const OFFSET_Y = 12;

function Ball({ num, material, apiRef, onWin }) {
  const winnerAnnounced = useRef(false);
  const [ref, api] = useSphere(() => ({
    mass: 1,
    args: [0.4],
    position: [(Math.random() - 0.5) * 3, OFFSET_Y + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4],
    restitution: 0.4,
    friction: 0.8,
  }));

  useEffect(() => {
    if (apiRef) apiRef.current = api;
  }, [api, apiRef]);

  useEffect(() => {
    const unsub = api.position.subscribe(p => {
      // Grand Basket floor top is at Y = -8.0. Trigger win if ball rests on the floor (Y < -7.0).
      if (p[2] > 20 && p[1] < -7.0 && !winnerAnnounced.current) {
        winnerAnnounced.current = true;
        onWin(num);
      }
    });
    return () => unsub();
  }, [api.position, onWin, num]);

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial {...material} />
      <Text position={[0, 0, 0.41]} fontSize={0.3} color="black" anchorX="center" anchorY="middle">
        {num}
      </Text>
      <Text position={[0, 0, -0.41]} rotation={[0, Math.PI, 0]} fontSize={0.3} color="black" anchorX="center" anchorY="middle">
        {num}
      </Text>
    </mesh>
  );
}

function EpicMachine({ isSpinning }) {
  const drumRef = useRef();

  useFrame(() => {
    if (isSpinning && drumRef.current) {
      drumRef.current.rotation.x += 0.05;
      drumRef.current.rotation.y += 0.02;
    }
  });

  const drumGeo = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(6, 1);
    // Remove bottom faces to create a massive hole for balls to fall out
    const positions = geo.attributes.position;
    const indices = geo.index.array;
    const newIndices = [];
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];
      const yA = positions.getY(a);
      const yB = positions.getY(b);
      const yC = positions.getY(c);
      if (yA > -4 && yB > -4 && yC > -4) {
        newIndices.push(a, b, c);
      }
    }
    geo.setIndex(newIndices);
    geo.scale(-1, 1, 1);
    return geo;
  }, []);

  const [physicsDrumRef, api] = useTrimesh(() => ({
    type: 'Kinematic',
    args: [drumGeo.attributes.position.array, drumGeo.index.array],
    position: [0, OFFSET_Y, 0],
    friction: 0.1,
    restitution: 0.5
  }));

  useFrame(() => {
    if (isSpinning && drumRef.current) {
      api.rotation.set(drumRef.current.rotation.x, drumRef.current.rotation.y, drumRef.current.rotation.z);
    }
  });

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

  // 4. Grand Basket (Massive Conical Bowl)
  const basketWallsGeo = useMemo(() => {
    // Top R=18, Bot R=8, Height=8.
    const geo = new THREE.CylinderGeometry(18, 8, 8, 64, 1, true);
    geo.scale(-1, 1, 1); // Flip normals inward so balls roll inside
    return geo;
  }, []);
  
  const basketFloorGeo = useMemo(() => {
    // R=8, Height=0.5
    return new THREE.CylinderGeometry(8, 8, 0.5, 64, 1, false);
  }, []);

  const [basketWallsRef] = useTrimesh(() => ({ type: 'Static', args: [basketWallsGeo.attributes.position.array, basketWallsGeo.index.array], position: [0, -4, 28], friction: 0.1 }));
  const [basketFloorRef] = useCylinder(() => ({ type: 'Static', args: [8, 8, 0.5, 64], position: [0, -8.25, 28], friction: 0.8, restitution: 0.2 }));

  return (
    <>
      <group ref={drumRef} position={[0, OFFSET_Y, 0]}>
        <mesh geometry={drumGeo}>
          <meshStandardMaterial {...glassMatProps} />
        </mesh>
        <mesh geometry={drumGeo}>
          <meshStandardMaterial {...wireMatProps} />
        </mesh>
      </group>

      <mesh geometry={mainFunnelGeo} position={[0, 0, 0]}>
        <meshStandardMaterial {...glassMatProps} />
      </mesh>
      <mesh geometry={mainFunnelGeo} position={[0, 0, 0]}>
        <meshStandardMaterial {...wireMatProps} />
      </mesh>

      {[subPosLeft, subPosRight, subPosCenter].map((pos, i) => (
        <group key={i}>
          <mesh geometry={subFunnelGeo} position={pos}>
            <meshStandardMaterial {...glassMatProps} />
          </mesh>
          <mesh geometry={subFunnelGeo} position={pos}>
            <meshStandardMaterial {...wireMatProps} />
          </mesh>
        </group>
      ))}

      <mesh geometry={tubeGeo1} position={[0, 0, 0]}>
        <meshStandardMaterial {...glassMatProps} color="#4ade80" />
      </mesh>
      <mesh geometry={tubeGeo1} position={[0, 0, 0]}>
        <meshStandardMaterial {...wireMatProps} color="#4ade80" opacity={0.3} />
      </mesh>

      <mesh geometry={tubeGeo2} position={[0, 0, 0]}>
        <meshStandardMaterial {...glassMatProps} color="#60a5fa" />
      </mesh>
      <mesh geometry={tubeGeo2} position={[0, 0, 0]}>
        <meshStandardMaterial {...wireMatProps} color="#60a5fa" opacity={0.3} />
      </mesh>

      <mesh geometry={tubeGeo3} position={[0, 0, 0]}>
        <meshStandardMaterial {...glassMatProps} color="#f87171" />
      </mesh>
      <mesh geometry={tubeGeo3} position={[0, 0, 0]}>
        <meshStandardMaterial {...wireMatProps} color="#f87171" opacity={0.3} />
      </mesh>

      {/* Grand Basket (Conical Bowl) */}
      <mesh geometry={basketWallsGeo} position={[0, -4, 28]}>
        <meshStandardMaterial {...glassMatProps} />
      </mesh>
      <mesh geometry={basketWallsGeo} position={[0, -4, 28]}>
        <meshStandardMaterial {...wireMatProps} />
      </mesh>
      <mesh geometry={basketFloorGeo} position={[0, -8.25, 28]}>
        <meshStandardMaterial {...glassMatProps} />
      </mesh>
      <mesh geometry={basketFloorGeo} position={[0, -8.25, 28]}>
        <meshStandardMaterial {...wireMatProps} />
      </mesh>
    </>
  );
}

function Scene({ reservedNumbers, isDrawing, isSpinning, onWin }) {
  const ballMaterial = {
    color: '#ffd700',
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 1.5,
  };

  const ballApis = useRef([]);

  useEffect(() => {
    if (isDrawing && ballApis.current.length > 0) {
      ballApis.current.forEach(api => {
        if (api) {
          api.wakeUp();
          api.applyImpulse(
            [(Math.random() - 0.5) * 5, -10, (Math.random() - 0.5) * 5],
            [0, 0, 0]
          );
        }
      });
    }
  }, [isDrawing]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} castShadow />
      <Environment preset="city" />

      <Physics gravity={[0, -15, 0]} defaultContactMaterial={{ restitution: 0.3, friction: 0.1 }}>
        <EpicMachine isSpinning={isSpinning} />
        {reservedNumbers.map((num, i) => (
          <Ball 
            key={num} 
            num={num} 
            material={ballMaterial} 
            apiRef={{ current: (api) => ballApis.current[i] = api }}
            onWin={onWin}
          />
        ))}
      </Physics>

      <ContactShadows position={[0, -9, 28]} opacity={0.4} scale={40} blur={2} far={10} />
    </>
  );
}

export default function Tombola() {
  const [reservedNumbers, setReservedNumbers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    setReservedNumbers(BOLETOS);
  }, []);

  const triggerDraw = () => {
    if (isDrawing || reservedNumbers.length === 0) return;
    setIsSpinning(true);
    setWinner(null);
    setTimeout(() => {
      setIsSpinning(false);
      setIsDrawing(true);
    }, 2000);
  };

  const triggerWin = (winningNumber) => {
    if (winner) return;
    setWinner(winningNumber);
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#ffffff', '#000000']
    });
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 100%)',
      fontFamily: '"Inter", sans-serif',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '5%', left: '0', width: '100%', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '3rem', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>Sorteo En Vivo</h1>
        <p style={{ color: 'var(--color-gold)', margin: 0 }}>{reservedNumbers.length} Boletos Participando</p>
      </div>

      <Canvas shadows camera={{ position: [0, 15, 48], fov: 45 }}>
        <Scene reservedNumbers={reservedNumbers} isDrawing={isDrawing} isSpinning={isSpinning} onWin={triggerWin} />
        <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} target={[0, -2, 12]} />
      </Canvas>

      {!isSpinning && !winner && reservedNumbers.length > 0 && (
        <button
          onClick={triggerDraw}
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '15px 40px',
            fontSize: '1.2rem',
            background: 'linear-gradient(45deg, #d4af37, #f3e5ab)',
            border: 'none',
            borderRadius: '30px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 10px 20px rgba(212, 175, 55, 0.3)',
            transition: 'transform 0.2s',
            zIndex: 10
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateX(-50%) scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'translateX(-50%) scale(1)'}
        >
          {isDrawing ? 'Sorteando...' : 'Sacar Boleto'}
        </button>
      )}

      {winner && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '40px 80px',
          borderRadius: '20px',
          border: '2px solid var(--color-gold)',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.5)',
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          zIndex: 20
        }}>
          <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0', color: 'var(--color-gold)' }}>¡Tenemos un Ganador!</h2>
          <div style={{ fontSize: '6rem', fontWeight: 'bold' }}>#{winner}</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 30px',
              background: 'transparent',
              border: '1px solid var(--color-gold)',
              color: 'var(--color-gold)',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            Nuevo Sorteo
          </button>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
