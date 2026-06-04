import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, MoreHorizontal, Sliders, Activity, Eye, Radio, Subtitles, Maximize2, Minimize2, Copy, Video, RotateCcw, RotateCw, FolderOpen, Moon, ArrowRightLeft } from 'lucide-react';
import { cn } from '../lib/utils';

const formatTime = (s) => {
  if (!s || isNaN(s)) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MenuItem = ({ icon, label, onClick, role = 'menuitem' }) => (
  <div onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition hover:bg-white/5 text-text-primary" role={role} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
    {icon} <span>{label}</span>
  </div>
);

const PlayerBar = ({
  currentTrack, isPlaying, togglePlay, progress, duration,
  previousTrack, nextTrack, shuffleMode, setShuffleMode,
  repeatMode, setRepeatMode, playbackRate, setPlaybackRate,
  volume, setVolume, audioRef,
  showVisualizer, setShowVisualizer, showWaveform, setShowWaveform,
  showLyrics, setShowLyrics, visualizerMode, setVisualizerMode,
  showMoreMenu, setShowMoreMenu, hoverTime, setHoverTime,
  isSeeking, setIsSeeking, layoutMode, setLayoutMode,
  setShowEqualizer, setShowEffects, setShowPlaybackRate,
  handleSeek, setMediaFullscreen, handleOpenFile,
  sleepTimer, setSleepTimer, volumeBoost, setVolumeBoost,
  crossfadeDuration, setCrossfadeDuration
}) => {
  const [showVolumePop, setShowVolumePop] = useState(false);
  const seekRef = useRef(null);
  const volumePopRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      try {
        if (volumePopRef.current && !volumePopRef.current.contains(e.target)) setShowVolumePop(false);
        if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false);
      } catch {}
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowMoreMenu]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isSeeking || !seekRef.current || !audioRef.current) return;
      const rect = seekRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioRef.current.currentTime = p * duration;
    };
    const handleMouseUp = () => setIsSeeking(false);
    if (isSeeking) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeeking, duration, audioRef, setIsSeeking]);

  return (
    <div className="player-bar h-28 border-t flex flex-col justify-center px-8 relative" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)'}}>
      <div className="absolute top-0 left-0 w-full h-1 cursor-pointer group" style={{backgroundColor:'rgba(255,255,255,0.05)'}}
           ref={seekRef}
           onClick={handleSeek}
           onMouseDown={() => setIsSeeking(true)}
           onMouseMove={(e) => {
             try {
               const rect = e.currentTarget.getBoundingClientRect();
               const p = (e.clientX - rect.left) / rect.width;
               setHoverTime(p * duration);
             } catch {}
           }}
           onMouseLeave={() => setHoverTime(null)}
           role="slider"
           aria-label="İlerleme çubuğu"
           aria-valuemin={0}
           aria-valuemax={duration}
           aria-valuenow={progress}
           aria-valuetext={`${formatTime(progress)} / ${formatTime(duration)}`}>
        <div className="h-full bg-blue-500 relative" style={{ width: `${(progress/duration)*100 || 0}%`, transition: isSeeking ? 'none' : 'all 0.1s ease' }}>
           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-xl border-2 border-blue-500" />
        </div>
        {hoverTime !== null && (
          <div className="absolute bottom-full mb-2 bg-black/90 px-2 py-1 rounded text-xs pointer-events-none" style={{ left: `${(hoverTime/duration)*100}%`, transform: 'translateX(-50%)' }}>
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-4 w-1/4 min-w-0">
           <div className="w-14 h-14 rounded-xl shadow-2xl flex-shrink-0 overflow-hidden border" style={{backgroundColor:'var(--color-bg-tertiary)', borderColor:'var(--border-color)'}}>
              {currentTrack?.picture && <img src={currentTrack.picture} className="w-full h-full object-cover" />}
           </div>
           <div className="truncate min-w-0">
             <div className="font-black truncate text-sm leading-tight" title={currentTrack?.title}>{currentTrack?.title || 'Hazır'}</div>
             <div className="text-xs truncate mt-0.5 text-muted-foreground" title={currentTrack?.artist}>{currentTrack?.artist || ''}</div>
             {currentTrack?.bpm > 0 && <div className="text-[9px] opacity-40">{currentTrack.bpm} BPM</div>}
           </div>
         </div>

          <div className="flex flex-col items-center w-2/4">
            <div className="flex items-center gap-3 md:gap-4 mb-1" role="toolbar" aria-label="Oynatma kontrolleri">
               <button onClick={() => setShuffleMode(!shuffleMode)} className={cn("p-1.5 md:p-2 rounded-lg transition press-scale", shuffleMode ? "text-primary" : "text-muted-foreground")} aria-label={shuffleMode ? 'Karışık çalmayı kapat' : 'Karışık çal'} aria-pressed={shuffleMode}><Shuffle size={14} /></button>
               <SkipBack size={18} className="md:w-[20px] md:h-[20px] cursor-pointer transition text-muted-foreground press-scale" onClick={previousTrack} role="button" tabIndex={0} aria-label="Önceki şarkı" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); previousTrack(); } }} />
               <button onClick={togglePlay} className="p-3 md:p-4 rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg text-white bg-primary press-scale" aria-label={isPlaying ? 'Duraklat' : 'Oynat'}>
                 {isPlaying ? <Pause fill="white" size={18} /> : <Play fill="white" size={18} />}
               </button>
               <SkipForward size={18} className="md:w-[20px] md:h-[20px] cursor-pointer transition text-muted-foreground press-scale" onClick={nextTrack} role="button" tabIndex={0} aria-label="Sonraki şarkı" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextTrack(); } }} />
                 <button onClick={() => {
                   setRepeatMode(repeatMode === 'off' ? 'track' : 'off');
                 }} className={cn("p-1.5 md:p-2 rounded-lg transition press-scale relative", repeatMode !== 'off' ? "text-primary" : "text-muted-foreground")} aria-label={repeatMode === 'off' ? 'Tekrarla' : 'Tekrarlamayı kapat'} aria-pressed={repeatMode !== 'off'}>
                   <Repeat size={14} />
                 </button>
            </div>
            <div className="text-[10px] font-bold tabular-nums text-muted-foreground">
               {formatTime(progress)} / {formatTime(duration)}
            </div>
         </div>

         <div className="flex items-center justify-end w-1/4 gap-1.5 md:gap-3" role="toolbar" aria-label="Ek kontroller">
           <button onClick={() => setMediaFullscreen(true)} className="p-1.5 md:p-2 rounded-lg transition hover:bg-white/10 text-muted-foreground" title="Tam Ekran (medyayı büyüt)" style={{filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.3))'}} aria-label="Tam ekran"><Maximize2 size={18} /></button>
           <button onClick={() => setLayoutMode(layoutMode === 'mini' ? 'normal' : 'mini')} className="p-1.5 md:p-2 rounded-lg transition hover:bg-white/10 text-muted-foreground" title={layoutMode === 'mini' ? 'Normal Görünüm' : 'Mini Oynatıcı'} aria-label={layoutMode === 'mini' ? 'Normal görünüm' : 'Mini oynatıcı'}>
              {layoutMode === 'mini' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
           </button>
           <div className="relative flex items-center" ref={volumePopRef}>
              <Volume2 size={18} className="cursor-pointer text-muted-foreground" onClick={() => setShowVolumePop(!showVolumePop)} role="button" tabIndex={0} aria-label="Ses seviyesi" aria-expanded={showVolumePop} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowVolumePop(!showVolumePop); } }} />
             {showVolumePop && (
               <div className="absolute bottom-full right-0 mb-3 p-3 rounded-2xl border shadow-2xl z-50" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)', width:'160px'}}>
                 <div className="flex items-center justify-center mb-2">
                   <span className="text-lg font-black tabular-nums" style={{color: volumeBoost > 1.0 ? '#ef4444' : 'var(--color-primary)'}}>{volume}%</span>
                   {volumeBoost > 1.0 &&                    <span className="text-[10px] ml-1 font-bold text-destructive">BOOST {Math.round(volumeBoost * 100)}%</span>}
                 </div>
                 <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="w-full" />
                 <div className="mt-2 flex items-center gap-2">
                   <span className="text-[10px] text-muted-foreground">Güçlendirme</span>
                   <input type="range" min="100" max="200" value={volumeBoost * 100} onChange={(e) => setVolumeBoost(parseInt(e.target.value) / 100)} className="flex-1" />
                   <span className={cn("text-[10px] font-bold", volumeBoost > 1.0 ? "text-destructive" : "text-muted-foreground")}>{Math.round(volumeBoost * 100)}%</span>
                 </div>
               </div>
             )}
          </div>

           <div className="relative" ref={moreMenuRef}>
             <MoreHorizontal size={18} className="md:w-[20px] md:h-[20px] cursor-pointer text-muted-foreground" onClick={() => setShowMoreMenu(!showMoreMenu)} role="button" tabIndex={0} aria-label="Daha fazla seçenek" aria-expanded={showMoreMenu} aria-haspopup="true" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowMoreMenu(!showMoreMenu); } }} />
             {showMoreMenu && (
               <div className="absolute bottom-full right-0 mb-4 border rounded-2xl py-1 w-52 shadow-2xl z-50 text-xs" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)'}} role="menu" aria-label="Daha fazla seçenek menüsü">
                <MenuItem icon={<Sliders size={13}/>} label="Ekolayzer" onClick={() => { setShowEqualizer(true); setShowMoreMenu(false); }} />
                <MenuItem icon={<Video size={13}/>} label="Efektler" onClick={() => { setShowEffects(true); setShowMoreMenu(false); }} />
                <MenuItem icon={<Activity size={13}/>} label={`Hız: ${playbackRate}x`} onClick={() => { setShowPlaybackRate(true); setShowMoreMenu(false); }} />
                <div className="h-px my-1" style={{backgroundColor:'var(--border-color)'}} />
                <MenuItem 
                  icon={<Eye size={13}/>} 
                  label={showVisualizer ? "✓ Görselleştirici" : "Görselleştirici"} 
                  onClick={() => {
                    const nextVal = !showVisualizer;
                    setShowVisualizer(nextVal);
                    if (nextVal) {
                      setVisualizerMode('spectrum');
                      setShowWaveform(false);
                    } else {
                      setVisualizerMode('none');
                    }
                    setShowMoreMenu(false);
                  }} 
                />
                <MenuItem 
                  icon={<Radio size={13}/>} 
                  label={showWaveform ? "✓ Ses Dalgası" : "Ses Dalgası"} 
                  onClick={() => { 
                    const nextVal = !showWaveform;
                    setShowWaveform(nextVal); 
                    if (nextVal) {
                      setShowVisualizer(false);
                      setVisualizerMode('none');
                    }
                    setShowMoreMenu(false);
                  }} 
                />
                 <MenuItem icon={<Subtitles size={13}/>} label={showLyrics ? "✓ Altyazı" : "Altyazı"} onClick={() => { setShowLyrics(!showLyrics); setShowMoreMenu(false); }} />
                 <div className="h-px my-1" style={{backgroundColor:'var(--border-color)'}} />
                 <MenuItem icon={<FolderOpen size={13}/>} label="Dosya Aç..." onClick={() => { handleOpenFile(); setShowMoreMenu(false); }} />
                 <MenuItem icon={<Copy size={13}/>} label="Adı Kopyala" onClick={() => { if(currentTrack?.title) navigator.clipboard.writeText(currentTrack.title); setShowMoreMenu(false); }} />
                 <MenuItem icon={<RotateCcw size={13}/>} label="10 sn Geri" onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10; setShowMoreMenu(false); }} />
                 <MenuItem icon={<RotateCw size={13}/>} label="30 sn İleri" onClick={() => { if(audioRef.current) audioRef.current.currentTime += 30; setShowMoreMenu(false); }} />
                 <div className="h-px my-1" style={{backgroundColor:'var(--border-color)'}} />
                 <MenuItem 
                   icon={<Moon size={13}/>} 
                   label={sleepTimer ? `Uyku Zamanlayıcı: ${sleepTimer} dk` : "Uyku Zamanlayıcı"} 
                   onClick={() => {
                     if (sleepTimer) {
                       setSleepTimer(null);
                     } else {
                       const mins = prompt('Dakika girin (örn: 30):', '30');
                       if (mins && !isNaN(parseInt(mins))) setSleepTimer(parseInt(mins));
                     }
                     setShowMoreMenu(false);
                   }} 
                 />
                 <MenuItem 
                   icon={<ArrowRightLeft size={13}/>} 
                   label={crossfadeDuration > 0 ? `Geçiş: ${crossfadeDuration}s` : 'Geçiş: Kapalı'} 
                   onClick={() => { 
                     const cycle = [0, 1, 2, 3, 5, 7, 10];
                     const idx = cycle.indexOf(crossfadeDuration);
                     setCrossfadeDuration(cycle[(idx + 1) % cycle.length]);
                     setShowMoreMenu(false); 
                   }} 
                 />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
