import React, { useEffect, useRef } from 'react';

const WaveformVisualizer = ({ audioRef, playing, className = '' }) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    
    async function init() {
      const WaveSurfer = (await import('wavesurfer.js')).default;
      
      if (!mounted || !containerRef.current) return;
      
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(255,255,255,0.2)',
        progressColor: 'var(--color-primary)',
        cursorColor: 'var(--color-primary)',
        barWidth: 2,
        barRadius: 2,
        barGap: 1,
        height: 64,
        normalize: true,
        backend: 'WebAudio',
        minPxPerSec: 1,
        fillParent: true,
        autoScroll: true,
        autoCenter: true,
      });
      
      wavesurferRef.current = ws;
      
      // Connect to audio element
      if (audioRef?.current) {
        try {
          ws.load(audioRef.current);
        } catch(e) {}
      }
      
      ws.on('interaction', (newTime) => {
        if (audioRef?.current) {
          audioRef.current.currentTime = newTime;
        }
      });
    }
    
    init();
    
    return () => {
      mounted = false;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioRef]);

  // Update when audio source changes
  useEffect(() => {
    if (wavesurferRef.current && audioRef?.current?.src) {
      try { wavesurferRef.current.load(audioRef.current); } catch(e) {}
    }
  }, [audioRef?.current?.src]);

  return (
    <div 
      ref={containerRef}
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
    />
  );
};

export default WaveformVisualizer;
