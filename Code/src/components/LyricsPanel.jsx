import React, { useRef, useEffect, useState } from 'react';
import { Subtitles, Upload, X, Clock, Music } from 'lucide-react';
import { useStore } from '../store';

const formatTime = (s) => {
  if (!s || isNaN(s)) return '--:--';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const SubtitleTimeline = ({ track, progress, audioRef }) => {
  const { mapping, setSubtitleTracks, setActiveSubtitle, setMapping, syncedLyricsCues, syncedLyricsLoading } = useStore();
  const subtitleInputRef = useRef(null);
  const [activeCueIndex, setActiveCueIndex] = useState(-1);
  const activeCueRef = useRef(null);
  const containerRef = useRef(null);

  // Priority: synced lyrics cues (LRCLib) > manual subtitle cues
  const activeSubtitle = mapping.subtitleTracks?.find(t => t.id === mapping.activeSubtitle);
  const manualCues = activeSubtitle?.cues || [];
  const cues = syncedLyricsCues.length > 0 ? syncedLyricsCues : manualCues;
  const hasSyncedLyrics = syncedLyricsCues.length > 0;
  const subtitleOffset = mapping.subtitleOffset || 0; // ms, from Screenbox pattern

  // Update active cue based on progress + offset
  useEffect(() => {
    if (!cues.length || !progress) {
      setActiveCueIndex(-1);
      return;
    }
    const adjustedProgress = progress + (subtitleOffset / 1000); // convert ms to seconds
    let found = -1;
    for (let i = cues.length - 1; i >= 0; i--) {
      if (adjustedProgress >= cues[i].start && adjustedProgress <= cues[i].end) {
        found = i;
        break;
      }
    }
    // If progress is past all cues, show last one
    if (found === -1 && cues.length > 0 && adjustedProgress > cues[cues.length - 1].end) {
      found = cues.length - 1;
    }
    setActiveCueIndex(found);
  }, [progress, cues, subtitleOffset]);

  // Auto-scroll to active cue
  useEffect(() => {
    if (activeCueRef.current && containerRef.current) {
      activeCueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeCueIndex]);

  const handleCueClick = (cue) => {
    if (audioRef?.current) {
      audioRef.current.currentTime = cue.start;
    }
  };

  const handleLoadSubtitle = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        const parsed = parseSubtitle(content, file.name);
        setSubtitleTracks([...mapping.subtitleTracks, parsed]);
        setActiveSubtitle(parsed.id);
      }
    };
    reader.readAsText(file);
  };

  const removeSubtitle = (id) => {
    setSubtitleTracks(mapping.subtitleTracks.filter(t => t.id !== id));
    if (mapping.activeSubtitle === id) {
      setActiveSubtitle(null);
    }
  };

  if (!track) {
    return (
      <div className="p-6 text-center" style={{color:'var(--text-secondary)'}}>
        <Music size={40} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm">Müzik seçilmedi</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Subtitle file selector */}
      <div className="p-4 border-b flex-shrink-0 space-y-2" style={{borderColor:'var(--border-color)'}}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => subtitleInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed text-xs font-bold transition hover:bg-white/5"
            style={{borderColor:'var(--border-color)', color:'var(--text-secondary)'}}
          >
            <Upload size={14} />
            <span>SRT/VTT Yükle</span>
          </button>
          <input ref={subtitleInputRef} type="file" accept=".srt,.vtt,.ass" className="hidden" onChange={handleLoadSubtitle} />
        </div>
        {mapping.subtitleTracks?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {mapping.subtitleTracks.map(track => (
              <div
                key={track.id}
                onClick={() => setActiveSubtitle(track.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                  mapping.activeSubtitle === track.id ? 'text-white' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: mapping.activeSubtitle === track.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'
                }}
              >
                <Subtitles size={11} />
                <span className="truncate max-w-[80px]">{track.name}</span>
                <span onClick={(e) => { e.stopPropagation(); removeSubtitle(track.id); }} className="ml-1 hover:text-red-400">
                  <X size={10} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {syncedLyricsLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6" style={{color:'var(--text-secondary)'}}>
            <Music size={36} className="mb-3 opacity-30 animate-pulse" />
            <p className="text-sm font-bold">Şarkı sözleri aranıyor...</p>
            <p className="text-xs mt-1 opacity-50">LRCLib</p>
          </div>
        ) : cues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6" style={{color:'var(--text-secondary)'}}>
            <Subtitles size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-bold">Altyazı/Şarkı Sözü Yok</p>
            <p className="text-xs mt-1">SRT/VTT dosyası yükleyin veya internet bağlantısı ile otomatik şarkı sözleri alın</p>
            <p className="text-[10px] mt-3 opacity-50">İpucu: Müzikle aynı adda .srt dosyasını yükleyin</p>
          </div>
        ) : (
          <div className="py-2">
            {hasSyncedLyrics && (
              <div className="px-4 pb-2 text-[10px] font-bold text-center" style={{color:'var(--color-primary)'}}>
                ♫ Senkronize Şarkı Sözleri (LRCLib)
              </div>
            )}
            {cues.map((cue, idx) => {
              const isActive = idx === activeCueIndex;
              const isPast = cue.end < progress;
              const isFuture = cue.start > progress;
              return (
                <div
                  key={cue.id || idx}
                  ref={isActive ? activeCueRef : null}
                  onClick={() => handleCueClick(cue)}
                  className={`group flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-all duration-300 border-l-2 ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-lg'
                      : isPast
                        ? 'border-transparent opacity-40 hover:opacity-70'
                        : 'border-transparent hover:bg-white/5'
                  }`}
                  style={{
                    borderLeftColor: isActive ? 'var(--color-primary)' : 'transparent',
                    boxShadow: isActive ? '0 0 12px 2px rgba(59, 130, 246, 0.15)' : 'none',
                    animation: isActive ? 'lyrics-glow 2s ease-in-out infinite' : 'none'
                  }}
                >
                  {/* Timestamp */}
                  <div className={`flex-shrink-0 text-[10px] font-mono font-bold mt-0.5 min-w-[60px] text-right ${
                    isActive ? 'text-blue-400' : 'text-gray-500'
                  }`}>
                    <Clock size={10} className="inline mr-1" />
                    {formatTime(cue.start)}
                  </div>
                  {/* Text */}
                  <div className={`text-sm leading-relaxed ${
                    isActive ? 'font-bold' : 'font-normal'
                  }`} style={{color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'}}>
                    {cue.text}
                  </div>
                  {/* Jump button on hover */}
                  <div className="ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{backgroundColor:'rgba(255,255,255,0.1)', color:'var(--color-primary)'}}>
                      {formatTime(cue.start)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {cues.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t text-[10px]" style={{borderColor:'var(--border-color)', color:'var(--text-secondary)'}}>
          <div className="flex items-center gap-2">
            <span className="font-bold">{formatTime(progress)}</span>
            <span className="opacity-40">/</span>
            <span>{activeCueIndex >= 0 ? `${activeCueIndex + 1}/${cues.length}` : `${cues.length} satır`}</span>
            {activeCueIndex >= 0 && (
              <span className="ml-auto text-blue-400">▶ {cues[activeCueIndex]?.text?.slice(0, 30)}</span>
        )}
      </div>

      {/* Subtitle Timing Offset — from Screenbox pattern (-3000ms to +3000ms) */}
      {cues.length > 0 && (
        <div className="px-4 py-2 border-b flex-shrink-0" style={{borderColor:'var(--border-color)'}}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold opacity-60" style={{color:'var(--text-secondary)'}}>Zamanlama:</span>
            <button
              onClick={() => setMapping('subtitleOffset', Math.max(-3000, (mapping.subtitleOffset || 0) - 500))}
              className="px-2 py-0.5 rounded text-[10px] font-bold transition hover:bg-white/10"
              style={{color:'var(--text-secondary)'}}
            >
              -500ms
            </button>
            <input
              type="range"
              min="-3000"
              max="3000"
              step="50"
              value={mapping.subtitleOffset || 0}
              onChange={(e) => setMapping('subtitleOffset', parseInt(e.target.value))}
              className="flex-1 h-1 rounded-full"
              style={{accentColor: 'var(--color-primary)'}}
            />
            <button
              onClick={() => setMapping('subtitleOffset', Math.min(3000, (mapping.subtitleOffset || 0) + 500))}
              className="px-2 py-0.5 rounded text-[10px] font-bold transition hover:bg-white/10"
              style={{color:'var(--text-secondary)'}}
            >
              +500ms
            </button>
            <span className={`text-[10px] font-mono font-bold min-w-[48px] text-right ${subtitleOffset !== 0 ? '' : 'opacity-40'}`} style={{color:'var(--text-secondary)'}}>
              {subtitleOffset > 0 ? `+${subtitleOffset}` : subtitleOffset}ms
            </span>
            {subtitleOffset !== 0 && (
              <button
                onClick={() => setMapping('subtitleOffset', 0)}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold transition hover:bg-white/10"
                style={{color:'var(--text-secondary)'}}
                title="Sıfırla"
              >
                ⟲
              </button>
            )}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

function parseSubtitle(content, filename) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const cues = [];
  let current = null;
  let id = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) {
        cues.push({ ...current, id: id++ });
        current = null;
      }
      continue;
    }
    if (current && current.text !== undefined) {
      current.text += '\n' + trimmed;
      continue;
    }
    if (!current) {
      const timeMatch = trimmed.match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/);
      if (timeMatch) {
        current = {
          start: parseTime(timeMatch[1]),
          end: parseTime(timeMatch[2]),
          text: ''
        };
        continue;
      }
      if (/^\d+$/.test(trimmed)) continue;
    }
  }
  if (current) cues.push({ ...current, id: id++ });

  return { id: `sub-${Date.now()}`, name: filename, cues };
}

function parseTime(str) {
  const parts = str.replace(',', '.').split(/[:.]/);
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]) + parseInt(parts[3] || '0') / 1000;
}

export default SubtitleTimeline;
