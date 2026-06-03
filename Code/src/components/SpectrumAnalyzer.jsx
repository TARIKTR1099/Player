import React, { useRef, useEffect } from 'react';

const SpectrumAnalyzer = ({ analyserRef, accentColor }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const analyser = analyserRef?.current;
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let animId;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const barCount = Math.min(64, bufferLength);
      const step = bufferLength / barCount;
      const barWidth = (w - (barCount - 1) * 2) / barCount;
      const c = accentColor || '#0f6cbd';
      const gradient = ctx.createLinearGradient(0, h, 0, 0);
      gradient.addColorStop(0, c + 'b3');
      gradient.addColorStop(0.5, c + 'e6');
      gradient.addColorStop(1, c);

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor(i * step);
        const value = dataArray[idx] / 255;
        const barHeight = Math.max(2, value * h * 0.9);
        const x = i * (barWidth + 2);
        const y = h - barHeight;

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
};

export default SpectrumAnalyzer;
