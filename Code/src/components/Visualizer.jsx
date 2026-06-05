import React, { useEffect, useRef, useState } from 'react';

const Visualizer = ({ analyserRef }) => {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = 150;

    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) { setError('WebGL desteklenmiyor'); return; }
    } catch { setError('WebGL kontrolu başarısız'); return; }

    let renderer = null;
    let scene = null;
    let camera = null;
    let particles = null;
    let glowSphere = null;
    let glowMat = null;
    let ring = null;
    let dataArray = null;

    // Dynamically import Three.js — deferred until this component actually renders
    import('three').then(mod => {
      if (!mounted) return;
      const THREE = mod.default || mod;
      initScene(THREE);
    }).catch(() => {
      if (mounted) setError('Three.js yüklenemedi');
    });

    function initScene(THREE) {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);

      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.z = 7;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const analyser = analyserRef?.current;
      if (analyser) {
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      }

      // Create sphere particles
      const particlesCount = 1200;
      const positions = new Float32Array(particlesCount * 3);
      const colors = new Float32Array(particlesCount * 3);

      for (let i = 0; i < particlesCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.5 + Math.random() * 1;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        colors[i * 3] = 0.05 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.4;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.5;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // Glow sphere
      glowMat = new THREE.MeshBasicMaterial({ color: 0x0f6cbd, transparent: true, opacity: 0.4 });
      const glowGeo = new THREE.SphereGeometry(0.8, 32, 32);
      glowSphere = new THREE.Mesh(glowGeo, glowMat);
      scene.add(glowSphere);

      // Outer ring
      const ringGeo = new THREE.TorusGeometry(1.2, 0.02, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x0f6cbd, transparent: true, opacity: 0.3 });
      ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);

      let time = 0;

      const animate = () => {
        animRef.current = requestAnimationFrame(animate);
        time += 0.005;

        const currentAnalyser = analyserRef?.current;
        if (currentAnalyser && !dataArray) {
          dataArray = new Uint8Array(currentAnalyser.frequencyBinCount);
        }

        if (currentAnalyser && dataArray) {
          currentAnalyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
          const scale = 1 + avg / 256;
          particles.scale.set(scale, scale, scale);
          glowSphere.scale.set(1 + avg / 256, 1 + avg / 256, 1 + avg / 256);
          glowMat.opacity = 0.2 + avg / 512;
          ring.scale.setScalar(1 + bassAvg / 512);
          ring.material.opacity = 0.2 + bassAvg / 512;
          ring.rotation.z += 0.02;
        }

        particles.rotation.x += 0.001;
        particles.rotation.y += 0.002;
        glowSphere.rotation.x += 0.003;
        glowSphere.rotation.y += 0.005;

        renderer.render(scene, camera);
      };

      animate();
    }

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (renderer) renderer.setSize(w, 150);
      if (camera) { camera.aspect = w / 150; camera.updateProjectionMatrix(); }
    };
    window.addEventListener('resize', onResize);

    return () => {
      mounted = false;
      window.removeEventListener('resize', onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (renderer && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (scene) scene.clear();
      if (renderer) renderer.dispose();
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ height: 150, backgroundColor: 'var(--color-bg-tertiary)' }}>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-2xl overflow-hidden relative" style={{ height: 150 }} />
  );
};

export default Visualizer;
