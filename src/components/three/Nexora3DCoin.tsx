import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCw, Eye, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

interface Nexora3DCoinProps {
  className?: string;
  autoRotateSpeed?: number;
  interactive?: boolean;
}

export const Nexora3DCoin: React.FC<Nexora3DCoinProps> = ({
  className = '',
  autoRotateSpeed = 1.0,
  interactive = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [coinFinish, setCoinFinish] = useState<'champagne' | 'rose' | 'platinum'>('champagne');

  // Mutable refs to prevent React state tearing down WebGL canvas
  const isRotatingRef = useRef(isRotating);
  isRotatingRef.current = isRotating;
  const finishRef = useRef(coinFinish);
  finishRef.current = coinFinish;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL as per threejs skill
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Studio 3-Point Lighting Rig
    // Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff1cf, 2.8);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    // Cool Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0xd9e6f2, 0x181a24, 1.2);
    scene.add(hemiLight);

    // Golden Rim / Specular Accent Light
    const rimLight = new THREE.DirectionalLight(0xd4af37, 2.5);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // 4. Procedural 3-12 Part Composite Model for NEXORA COIN
    const coinGroup = new THREE.Group();

    // Color definitions
    const FINISH_COLORS = {
      champagne: {
        body: 0xd4af37, // Metallic gold
        accent: 0xfff0b3, // High polish champagne highlight
        roughness: 0.18,
        metalness: 0.96,
      },
      rose: {
        body: 0xe09878, // Rose gold
        accent: 0xffd2c2,
        roughness: 0.22,
        metalness: 0.94,
      },
      platinum: {
        body: 0xdde2ea, // White platinum / titanium
        accent: 0xffffff,
        roughness: 0.15,
        metalness: 0.98,
      },
    };

    const currentColors = FINISH_COLORS[coinFinish];

    // Part 1: Main Coin Core Disc
    const coreGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.28, 64);
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: currentColors.body,
      metalness: currentColors.metalness,
      roughness: currentColors.roughness,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, goldMat);
    coreMesh.rotation.x = Math.PI / 2;
    coreMesh.castShadow = !isSoftwareGl;
    coreMesh.receiveShadow = !isSoftwareGl;
    coinGroup.add(coreMesh);

    // Part 2: Outer Serrated / Milled Edge (Ribbed Coin Rim)
    const rimCount = 48;
    const rimGeo = new THREE.BoxGeometry(0.04, 0.26, 0.08);
    const rimMat = new THREE.MeshStandardMaterial({
      color: currentColors.accent,
      metalness: 0.92,
      roughness: 0.35,
    });
    const rimInstanced = new THREE.InstancedMesh(rimGeo, rimMat, rimCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rimCount; i++) {
      const angle = (i / rimCount) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * 1.91, Math.sin(angle) * 1.91, 0);
      dummy.rotation.z = angle;
      dummy.updateMatrix();
      rimInstanced.setMatrixAt(i, dummy.matrix);
    }
    rimInstanced.instanceMatrix.needsUpdate = true;
    coinGroup.add(rimInstanced);

    // Part 3: Front Beveled Chapter Ring (Inner relief field)
    const ringGeo = new THREE.TorusGeometry(1.68, 0.06, 16, 64);
    const accentMat = new THREE.MeshPhysicalMaterial({
      color: currentColors.accent,
      metalness: 0.98,
      roughness: 0.12,
      clearcoat: 0.8,
    });
    const frontRing = new THREE.Mesh(ringGeo, accentMat);
    frontRing.position.z = 0.145;
    coinGroup.add(frontRing);

    // Back Chapter Ring
    const backRing = new THREE.Mesh(ringGeo, accentMat);
    backRing.position.z = -0.145;
    coinGroup.add(backRing);

    // Part 4: Futuristic 3D "N" Insignia on Front Face
    const emblemGroup = new THREE.Group();

    // Geometric N components (Left bar, diagonal bridge, right bar)
    const barGeo = new THREE.BoxGeometry(0.24, 1.45, 0.12);
    const diagGeo = new THREE.BoxGeometry(0.24, 1.62, 0.12);

    const leftBar = new THREE.Mesh(barGeo, accentMat);
    leftBar.position.set(-0.55, 0, 0.17);
    emblemGroup.add(leftBar);

    const rightBar = new THREE.Mesh(barGeo, accentMat);
    rightBar.position.set(0.55, 0, 0.17);
    emblemGroup.add(rightBar);

    const diagBar = new THREE.Mesh(diagGeo, accentMat);
    diagBar.position.set(0, 0, 0.17);
    diagBar.rotation.z = -0.68;
    emblemGroup.add(diagBar);

    // Angular futuristic corner accents for the N
    const gemGeo = new THREE.OctahedronGeometry(0.12);
    const topAccent = new THREE.Mesh(gemGeo, accentMat);
    topAccent.position.set(-0.55, 0.82, 0.17);
    emblemGroup.add(topAccent);

    const bottomAccent = new THREE.Mesh(gemGeo, accentMat);
    bottomAccent.position.set(0.55, -0.82, 0.17);
    emblemGroup.add(bottomAccent);

    coinGroup.add(emblemGroup);

    // Part 5: Reverse Face Nexora Quantum Matrix & Constellation Nodes
    const reverseGroup = new THREE.Group();
    const hexRingGeo = new THREE.RingGeometry(0.5, 0.85, 6);
    const hexRingMat = new THREE.MeshStandardMaterial({
      color: currentColors.accent,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const hexRing = new THREE.Mesh(hexRingGeo, hexRingMat);
    hexRing.position.z = -0.155;
    reverseGroup.add(hexRing);

    // 6 Hexagonal Nodes around perimeter of back
    const nodeGeo = new THREE.SphereGeometry(0.08, 12, 12);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const nodeMesh = new THREE.Mesh(nodeGeo, accentMat);
      nodeMesh.position.set(Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, -0.16);
      reverseGroup.add(nodeMesh);
    }
    coinGroup.add(reverseGroup);

    // Part 6: Ambient Gold Luminescence Particle Field
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 5;
      particlePositions[i + 1] = (Math.random() - 0.5) * 5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 3;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Part 7: Grounding Contact Shadow Plane directly underneath
    const shadowGeo = new THREE.PlaneGeometry(3.8, 3.8);
    // Procedural soft radial shadow canvas
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0,0,0,0.65)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.2;
    scene.add(shadowPlane);

    scene.add(coinGroup);

    // 5. Interactive Mouse Drag / Tilt with Damping
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0.2;

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotationY += deltaX * 0.012;
        targetRotationX += deltaY * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        // Subtle tilt towards cursor
        const rect = container.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        targetRotationX = 0.2 + normY * 0.4;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 6. Lossless 60fps Loop with Exponential Damping
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update finish color if changed
      const desiredColors = FINISH_COLORS[finishRef.current];
      if (goldMat.color.getHex() !== desiredColors.body) {
        goldMat.color.setHex(desiredColors.body);
        goldMat.metalness = desiredColors.metalness;
        goldMat.roughness = desiredColors.roughness;
        accentMat.color.setHex(desiredColors.accent);
        rimMat.color.setHex(desiredColors.accent);
      }

      // Auto rotation
      if (isRotatingRef.current && !isDragging) {
        targetRotationY += delta * autoRotateSpeed * 0.9;
      }

      // Smooth exponential damping
      const dampingFactor = 1 - Math.exp(-9 * delta);
      coinGroup.rotation.y += (targetRotationY - coinGroup.rotation.y) * dampingFactor;
      coinGroup.rotation.x += (targetRotationX - coinGroup.rotation.x) * dampingFactor;

      // Gentle floating bob
      coinGroup.position.y = Math.sin(now * 0.0018) * 0.12;

      // Subtle particle swirl
      particles.rotation.y += delta * 0.15;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);

      // Clean up Three.js resources
      coreGeo.dispose();
      goldMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      ringGeo.dispose();
      accentMat.dispose();
      barGeo.dispose();
      diagGeo.dispose();
      gemGeo.dispose();
      hexRingGeo.dispose();
      hexRingMat.dispose();
      nodeGeo.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();
      renderer.dispose();

      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [autoRotateSpeed, interactive]);

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D WebGL Canvas ref container */}
      <div
        ref={mountRef}
        data-testid="nexora-3d-coin-canvas"
        className="w-full h-full cursor-grab active:cursor-grabbing focus:outline-none"
        title="Click and drag to rotate the 3D NEXORA COIN"
      />

      {/* Sleek bottom control dock (Collapsible, <=15% footprint, solid rgba surfaces, no backdrop-filter over WebGL) */}
      {interactive && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto">
          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={() => setIsDockOpen(!isDockOpen)}
            className="flex items-center gap-1.5 px-3 py-1 mb-1.5 text-xs font-medium text-[#F3E5AB]/80 bg-[#12141D]/90 border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 hover:text-[#FFF3D6] rounded-full transition-all duration-200 shadow-lg"
            aria-label={isDockOpen ? 'Collapse 3D inspection dock' : 'Expand 3D inspection dock'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#ECC86A]" />
            <span>{isDockOpen ? 'Hide 3D Tools' : 'Inspect 3D Coin'}</span>
            {isDockOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Unified Compact Control Dock */}
          {isDockOpen && (
            <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-[#0E1017]/95 border border-[#D4AF37]/35 rounded-2xl shadow-2xl max-w-sm">
              {/* Rotation Toggle */}
              <button
                onClick={() => setIsRotating(!isRotating)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  isRotating
                    ? 'bg-[#D4AF37]/20 text-[#FFF3D6] border border-[#D4AF37]/50'
                    : 'bg-[#181B26] text-slate-300 hover:text-white border border-slate-700'
                }`}
                title="Toggle Auto Rotation"
              >
                <RotateCw className={`w-3 h-3 ${isRotating ? 'animate-spin-slow' : ''}`} />
                <span>{isRotating ? 'Spinning' : 'Paused'}</span>
              </button>

              {/* Material Finish Swatches */}
              <div className="flex items-center gap-1 bg-[#151823] p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setCoinFinish('champagne')}
                  className={`px-2 py-0.5 text-xs rounded transition-all ${
                    coinFinish === 'champagne'
                      ? 'bg-[#D4AF37] text-black font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="24K Champagne Gold"
                >
                  Gold
                </button>
                <button
                  onClick={() => setCoinFinish('rose')}
                  className={`px-2 py-0.5 text-xs rounded transition-all ${
                    coinFinish === 'rose'
                      ? 'bg-[#E09878] text-black font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Rose Gold Alloy"
                >
                  Rose
                </button>
                <button
                  onClick={() => setCoinFinish('platinum')}
                  className={`px-2 py-0.5 text-xs rounded transition-all ${
                    coinFinish === 'platinum'
                      ? 'bg-slate-200 text-black font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Platinum Titanium"
                >
                  Platinum
                </button>
              </div>

              {/* Static Spec Badge */}
              <div className="flex items-center gap-1 text-[11px] text-[#ECC86A]/80 px-2 py-0.5 font-mono">
                <Sparkles className="w-3 h-3 text-[#ECC86A]" />
                <span>PBR 60fps</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
