import React, { useEffect, useRef } from 'react';

const Visualizer3D = ({ audioContext, playing, className = '' }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let scene, camera, renderer, analyser, dataArray, bars = [];
    
    async function init() {
      const THREE = (await import('three')).default;
      if (!mounted || !containerRef.current) return;
      
      const container = containerRef.current;
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 300;
      
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.z = 30;
      
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
      
      // Audio analyser - higher resolution
      if (audioContext) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        try {
          audioContext.destination.connect(analyser);
        } catch(e) {
          // Already connected, create a separate chain
        }
      }
      
      // Create bars - more bars for smoother visualization
      const barCount = 64;
      const geometry = new THREE.BoxGeometry(0.3, 0.5, 0.3);
      
      for (let i = 0; i < barCount; i++) {
        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color().setHSL(i / barCount, 0.8, 0.5),
          emissive: new THREE.Color().setHSL(i / barCount, 0.8, 0.2),
          emissiveIntensity: 0.3,
        });
        const bar = new THREE.Mesh(geometry, material);
        const angle = (i / barCount) * Math.PI * 2;
        const radius = 8;
        bar.position.x = Math.cos(angle) * radius;
        bar.position.z = Math.sin(angle) * radius;
        bar.position.y = -2;
        scene.add(bar);
        bars.push({ mesh: bar, angle, radius, baseY: -2 });
      }
      
      // Center sphere - pulsing orb
      const sphereGeo = new THREE.SphereGeometry(1.5, 32, 32);
      const sphereMat = new THREE.MeshPhongMaterial({
        color: 0x0f6cbd,
        emissive: 0x0f6cbd,
        emissiveIntensity: 0.5,
        shininess: 100,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      scene.add(sphere);
      
      // Outer ring
      const ringGeo = new THREE.TorusGeometry(6, 0.05, 8, 64);
      const ringMat = new THREE.MeshPhongMaterial({
        color: 0x0f6cbd,
        emissive: 0x0f6cbd,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      
      // Particles
      const particleCount = 200;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0x0f6cbd,
        size: 0.1,
        transparent: true,
        opacity: 0.6,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);
      
      // Lights
      const ambient = new THREE.AmbientLight(0x404040);
      scene.add(ambient);
      const light = new THREE.PointLight(0xffffff, 1.5);
      light.position.set(10, 20, 10);
      scene.add(light);
      const light2 = new THREE.PointLight(0x0f6cbd, 0.8);
      light2.position.set(-10, -10, 10);
      scene.add(light2);
      
      sceneRef.current = { scene, camera, renderer, analyser, dataArray, bars, sphere, ring, particles };
      
      // Animation loop
      function animate() {
        if (!mounted) return;
        animRef.current = requestAnimationFrame(animate);
        
        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          
          bars.forEach((bar, i) => {
            const val = dataArray[i * 2] || 0;
            const scale = 0.1 + (val / 255) * 8;
            bar.mesh.scale.y = scale;
            bar.mesh.position.y = bar.baseY + scale / 2;
            
            // Rotate toward center
            bar.mesh.rotation.x += 0.02;
            bar.mesh.rotation.y += 0.03;
            
            // Color intensity based on value
            const hue = (i / bars.length + (Date.now() % 10000) / 10000) % 1;
            bar.mesh.material.color.setHSL(hue, 0.9, 0.3 + (val / 255) * 0.5);
            bar.mesh.material.emissive.setHSL(hue, 0.9, 0.1 + (val / 255) * 0.4);
          });
          
          // Pulse sphere
          sphere.scale.setScalar(1 + (avg / 255) * 0.8);
          sphere.material.emissiveIntensity = 0.3 + (avg / 255) * 0.7;
          
          // Ring pulse
          ring.scale.setScalar(1 + (avg / 255) * 0.3);
          ring.material.opacity = 0.3 + (avg / 255) * 0.5;
          ring.rotation.z += 0.01;
          
          // Particles react to bass
          particles.rotation.y += 0.002;
          const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
          particles.material.size = 0.05 + (bassAvg / 255) * 0.2;
          particles.material.opacity = 0.3 + (bassAvg / 255) * 0.5;
        }
        
        scene.rotation.y += 0.005;
        renderer.render(scene, camera);
      }
      
      animate();
    }
    
    init();
    
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      mounted = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (renderer) {
        renderer.dispose();
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [audioContext]);

  return (
    <div 
      ref={containerRef}
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: '200px', backgroundColor: 'rgba(0,0,0,0.3)' }}
    />
  );
};

export default Visualizer3D;
