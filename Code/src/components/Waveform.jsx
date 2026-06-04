import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

const formatTime = (s) => {
  if (!s || isNaN(s)) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const Waveform = ({ audioRef }) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [trimStart, setTrimStart] = useState(null);
  const [trimEnd, setTrimEnd] = useState(null);
  const [cutA, setCutA] = useState(null);
  const [cutB, setCutB] = useState(null);
  const [trimMode, setTrimMode] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const pct = (val) => val != null && duration ? Math.round((val / duration) * 100) + '%' : null;

  const doTrim = useCallback(() => {
    const audio = audioRef?.current;
    if (!audio || !duration) return;
    if (trimStart != null && audio.currentTime < trimStart) audio.currentTime = trimStart;
    if (trimEnd != null && audio.currentTime > trimEnd) audio.currentTime = trimEnd;
    if (cutA != null && cutB != null) {
      const lo = Math.min(cutA, cutB);
      const hi = Math.max(cutA, cutB);
      if (audio.currentTime >= lo && audio.currentTime < hi) audio.currentTime = hi;
    }
  }, [trimStart, trimEnd, cutA, cutB, duration, audioRef]);

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    const handler = () => doTrim();
    audio.addEventListener('timeupdate', handler);
    audio.addEventListener('seeked', handler);
    return () => {
      audio.removeEventListener('timeupdate', handler);
      audio.removeEventListener('seeked', handler);
    };
  }, [doTrim, audioRef]);

  // Track playhead position
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    const update = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('seeked', update);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('seeked', update);
    };
  }, [audioRef]);

  useEffect(() => {
    if (!containerRef.current || !audioRef?.current) return;
    const audio = audioRef.current;
    const src = audio.src || '';
    if (!src) return;
    setTrimStart(null); setTrimEnd(null); setCutA(null); setCutB(null); setTrimMode(null);

    try {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(0, 200, 255, 0.25)',
        progressColor: 'rgba(0, 180, 255, 0.9)',
        cursorColor: 'rgba(255, 255, 255, 0.4)',
        barWidth: 3,
        barGap: 1,
        barRadius: 2,
        height: 120,
        normalize: true,
        backend: 'MediaElement',
        media: audio,
        interact: false,
      });

      wavesurferRef.current.on('click', (relativePos) => {
        if (!audio || !duration) return;
        const clickTime = relativePos * duration;

        if (trimMode === 'start') { setTrimStart(clickTime); setTrimMode(null); }
        else if (trimMode === 'end') { setTrimEnd(clickTime); setTrimMode(null); }
        else if (trimMode === 'cut') {
          if (cutA == null) setCutA(clickTime);
          else if (cutB == null) { setCutB(clickTime); setTrimMode(null); }
        } else {
          audio.currentTime = clickTime;
        }
      });

      wavesurferRef.current.on('ready', () => {
        if (audio) setDuration(audio.duration || 0);
      });
    } catch (e) {
      console.log('WaveSurfer init error:', e.message);
    }

    return () => {
      if (wavesurferRef.current) {
        try { wavesurferRef.current.destroy(); } catch {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef?.current?.src]);

  const clearTrims = () => { setTrimStart(null); setTrimEnd(null); setCutA(null); setCutB(null); setTrimMode(null); };

  const trimInfo = [];
  if (trimStart != null) trimInfo.push(`Baş: ${formatTime(trimStart)}`);
  if (trimEnd != null) trimInfo.push(`Son: ${formatTime(trimEnd)}`);
  if (cutA != null && cutB != null) trimInfo.push(`Atla: ${formatTime(cutA)}-${formatTime(cutB)}`);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-1.5 px-1 pb-1 flex-wrap">
        <button
          onClick={() => setTrimMode(trimMode === 'start' ? null : 'start')}
          className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${trimMode === 'start' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
        >
          Trim Başı
        </button>
        <button
          onClick={() => setTrimMode(trimMode === 'end' ? null : 'end')}
          className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${trimMode === 'end' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
        >
          Trim Sonu
        </button>
        <button
          onClick={() => setTrimMode(trimMode === 'cut' ? null : 'cut')}
          className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${trimMode === 'cut' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
        >
          Aradan Kırp
        </button>
        {(trimStart != null || trimEnd != null || cutA != null) && (
          <button onClick={clearTrims} className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/40 transition">
            Temizle
          </button>
        )}
        <div className="text-[10px] text-white/40 ml-auto">
          {trimMode ? (trimMode === 'start' ? 'Dalga formuna tıkla → başlangıç' : trimMode === 'end' ? 'Dalga formuna tıkla → bitiş' : cutA == null ? '1. noktayı işaretle' : '2. noktayı işaretle') : (trimInfo.length ? trimInfo.join(' | ') : '')}
        </div>
      </div>
      <div className="flex-1 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 cursor-pointer"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(0, 180, 255, 0.15))',
          }}
        />
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            bottom: '-30px',
            height: '30px',
            transform: 'scaleY(-1)',
            opacity: 0.12,
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
            filter: 'blur(1px)',
          }}
        >
          <div ref={(el) => {
            if (!el) return;
            const src = containerRef.current?.querySelector('canvas');
            if (!src) return;
            let clone = el.querySelector('canvas');
            if (!clone) {
              clone = document.createElement('canvas');
              el.appendChild(clone);
            }
            clone.width = src.width;
            clone.height = Math.min(src.height, 30 * (window.devicePixelRatio || 1));
            clone.style.width = '100%';
            clone.style.height = '30px';
            const ctx = clone.getContext('2d');
            ctx.clearRect(0, 0, clone.width, clone.height);
            ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, clone.width, clone.height);
          }} />
        </div>
        {trimStart != null && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-green-400 z-10 pointer-events-none" style={{ left: pct(trimStart) }} />
        )}
        {trimEnd != null && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none" style={{ left: pct(trimEnd) }} />
        )}
        {cutA != null && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 pointer-events-none" style={{ left: pct(cutA) }} />
        )}
        {cutB != null && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-orange-400 z-10 pointer-events-none" style={{ left: pct(cutB) }} />
        )}
        {trimStart != null && (
          <div className="absolute top-0 left-0 h-full bg-green-500/10 z-10 pointer-events-none" style={{ width: pct(trimStart) }} />
        )}
        {trimEnd != null && (
          <div className="absolute top-0 right-0 h-full bg-red-500/10 z-10 pointer-events-none" style={{ width: `calc(100% - ${pct(trimEnd)})` }} />
        )}
        {/* Playhead - current position line */}
        {duration > 0 && currentTime > 0 && (
          <div className="absolute top-0 bottom-0 w-px bg-white/60 z-10 pointer-events-none shadow-[0_0_6px_rgba(255,255,255,0.3)]" style={{ left: `${(currentTime / duration) * 100}%` }} />
        )}
      </div>
    </div>
  );
};

export default Waveform;
