import React, { useRef, useEffect } from 'react';

const SpectrumAnalyzer = ({ analyserRef }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const analyser = analyserRef?.current;
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let animId;

    const prevBars = new Float32Array(80).fill(0);

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

    const COLORS = [
      { r: 0, g: 255, b: 255 },    // cyan
      { r: 0, g: 140, b: 255 },    // blue
      { r: 100, g: 60, b: 220 },   // purple
      { r: 220, g: 40, b: 200 },   // magenta
    ];

    const getBarColor = (t) => {
      const idx = t * (COLORS.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, COLORS.length - 1);
      const frac = idx - lo;
      const r = Math.round(COLORS[lo].r + (COLORS[hi].r - COLORS[lo].r) * frac);
      const g = Math.round(COLORS[lo].g + (COLORS[hi].g - COLORS[lo].g) * frac);
      const b = Math.round(COLORS[lo].b + (COLORS[hi].b - COLORS[lo].b) * frac);
      return { r, g, b };
    };

    const draw = () => {
      animId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const barCount = 64;
      const gap = 2;
      const barWidth = Math.max(2, (w - (barCount - 1) * gap) / barCount);
      const step = bufferLength / barCount;

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor(i * step);
        const raw = dataArray[idx] / 255;
        const target = Math.max(0.015, raw);
        prevBars[i] += (target - prevBars[i]) * 0.3;
        const value = prevBars[i];

        const barHeight = Math.max(2, value * h * 0.92);
        const x = i * (barWidth + gap);
        const y = h - barHeight;
        const t = i / barCount;

        const c = getBarColor(t);
        const gradient = ctx.createLinearGradient(x, h, x, y);
        gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.35)`);
        gradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, 0.7)`);
        gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        ctx.fill();

        if (value > 0.08) {
          const glowColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${value * 0.35})`;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${value * 0.5})`;
          ctx.fillRect(x, y - 2, barWidth, 2);
          ctx.shadowBlur = 0;
        }
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

export default React.memo(SpectrumAnalyzer);
