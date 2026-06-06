import React, { useState, useCallback } from 'react';
import { Play, Music, ListMusic, Plus, Edit3, Copy, Scissors, Tag, Eye, Radio, FileAudio, Info, Trash2, Clock, Heart } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Highlight matching text within a string. Used for search highlighting.
 * Returns an array of React nodes with the matching parts wrapped in <mark>.
 */
export function HighlightText({ text, query }) {
  if (!text) return null;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return <>{text}</>;
  }
  const q = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const parts = [];
  let lastIdx = 0;
  let idx = lowerText.indexOf(lowerQuery, lastIdx);
  while (idx !== -1) {
    if (idx > lastIdx) parts.push(text.substring(lastIdx, idx));
    parts.push(
      <mark
        key={idx}
        style={{
          backgroundColor: 'rgba(251, 191, 36, 0.35)',
          color: 'inherit',
          padding: '0 1px',
          borderRadius: '2px',
        }}
      >
        {text.substring(idx, idx + q.length)}
      </mark>
    );
    lastIdx = idx + q.length;
    idx = lowerText.indexOf(lowerQuery, lastIdx);
  }
  if (lastIdx < text.length) parts.push(text.substring(lastIdx));
  return <>{parts}</>;
}

/**
 * Track list rendering components extracted from App.jsx.
 * Round 14 refactoring — reduces App.jsx from ~1659 to ~1520 lines.
 */

export const MenuItem = ({ icon, label, onClick }) => (
  <div onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition hover:bg-white/5 text-text-primary">
    {icon} <span>{label}</span>
  </div>
);

export const CtxItem = ({ icon, label, onClick, className = '' }) => (
  <div onClick={onClick} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer transition hover:bg-white/5", className)}>
    {icon} <span>{label}</span>
  </div>
);

export const GridTrack = React.memo(({ track, onPlay, onCtx, selected, searchQuery }) => (
  <div onClick={onPlay} onContextMenu={onCtx} className={cn("p-3 rounded-2xl cursor-pointer group transition border hover-lift press-scale", selected ? 'bg-primary/15 border-primary' : 'bg-bg-secondary border-transparent')}>
    <div className="aspect-square rounded-xl mb-3 overflow-hidden relative border border-border bg-bg-tertiary">
      {track.picture && <img src={track.picture} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" loading="lazy" />}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center bg-primary/40">
        <Play fill="white" size={24} />
      </div>
    </div>
    <div className="font-bold text-xs truncate"><HighlightText text={track.title} query={searchQuery} /></div>
    <div className="text-[10px] truncate text-muted-foreground"><HighlightText text={track.artist} query={searchQuery} /></div>
    {track.bpm > 0 && <div className="text-[9px] mt-1 opacity-40">{track.bpm} BPM</div>}
  </div>
));

export const ListTrack = React.memo(({ track, index, onPlay, onCtx, formatTime, selected, searchQuery }) => (
  <div onClick={onPlay} onContextMenu={onCtx} className={cn("flex items-center px-4 py-2.5 cursor-pointer transition hover:bg-white/5 transition-colors duration-150 outline-offset-[-1.5px]", selected ? 'bg-primary/15 outline-primary outline-1.5' : index % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-primary')}>
    <div className="w-10 text-xs text-muted-foreground">{index + 1}</div>
    <div className="flex-1 flex items-center gap-3 min-w-0">
      {track.picture ? <img src={track.picture} className="w-8 h-8 rounded" loading="lazy" /> : <div className="w-8 h-8 rounded flex items-center justify-center bg-bg-tertiary"><Music size={14} className="opacity-30" /></div>}
      <span className="text-xs font-bold truncate" title={track.title}><HighlightText text={track.title} query={searchQuery} /></span>
     </div>
     <div className="w-40 text-[10px] truncate text-muted-foreground" title={track.artist}><HighlightText text={track.artist} query={searchQuery} /></div>
    <div className="w-24 text-[10px] text-muted-foreground">{track.duration ? formatTime(track.duration) : '0:00'}</div>
  </div>
));

export const CompactTrack = React.memo(({ track, index, onPlay, onCtx, formatTime, selected, searchQuery }) => (
  <div onClick={onPlay} onContextMenu={onCtx} className={cn("flex items-center px-3 py-1.5 rounded-lg cursor-pointer transition hover:bg-white/5 transition-colors border", selected ? 'bg-primary/15 border-primary' : 'bg-bg-secondary border-transparent')}>
    <div className="w-6 text-[10px] text-muted-foreground">{index + 1}</div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-bold truncate"><HighlightText text={track.title} query={searchQuery} /></div>
      <div className="text-[9px] truncate text-muted-foreground"><HighlightText text={track.artist} query={searchQuery} /></div>
    </div>
    <div className="text-[9px] ml-3 text-muted-foreground">{track.duration ? formatTime(track.duration) : '0:00'}</div>
  </div>
));

export const ContextMenu = React.forwardRef(({ x, y, track, onClose, onPlay, onRename, onDelete, onShowInfo, onShowLocation, onToggleVisualizer, onToggleWaveform, categories, onAssignCategory, onAddToQueue, onPlayNext, playlists, onAddToPlaylist }, ref) => {
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  const clampPos = useCallback((posX, posY, width, height) => {
    const mw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const mh = typeof window !== 'undefined' ? window.innerHeight : 1080;
    return {
      left: Math.max(8, Math.min(posX, mw - width - 8)),
      top: Math.max(8, Math.min(posY, mh - height - 8)),
    };
  }, []);

  const mainStyle = { backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--border-color)', minWidth: '180px', ...clampPos(x, y, 180, 300) };

  const groups = [
    { id: 'playback', label: 'Oynatma', items: [
      { icon: <Play size={13}/>, label: 'Oynat', action: onPlay },
      { icon: <ListMusic size={13}/>, label: 'Sıradaki', action: () => { onPlayNext(); onClose(); } },
      { icon: <Plus size={13}/>, label: 'Sıraya Ekle', action: () => { onAddToQueue(); onClose(); } }
    ] },
    { id: 'edit', label: 'Düzenle', items: [
      { icon: <Edit3 size={13}/>, label: 'Adını Değiştir (F2)', action: onRename },
      { icon: <Copy size={13}/>, label: 'Adı Kopyala', action: () => { if (track?.title) navigator.clipboard.writeText(track.title); onClose(); } },
      { icon: <Heart size={13}/>, label: 'Favorilere Ekle/Çıkar', action: () => { onToggleFavorite && onToggleFavorite(); onClose(); } },
      { icon: <Scissors size={13}/>, label: 'Kırp / Düzenle', action: () => { onToggleWaveform(); onClose(); setTimeout(() => { document.querySelector('.waveform-trim-btn')?.scrollIntoView({ behavior: 'smooth' }); }, 300); } },
      { icon: <Tag size={13}/>, label: 'Kategori Ata', action: () => { setShowCategoryPicker(!showCategoryPicker); setShowPlaylistPicker(false); } },
      { icon: <ListMusic size={13}/>, label: 'Çalma Listesine Ekle', action: () => { setShowPlaylistPicker(!showPlaylistPicker); setShowCategoryPicker(false); } }
    ] },
    { id: 'tools', label: 'Araçlar', items: [{ icon: <Eye size={13}/>, label: 'Görselleştirici', action: onToggleVisualizer }, { icon: <Radio size={13}/>, label: 'Dalga Formu', action: onToggleWaveform }, { icon: <FileAudio size={13}/>, label: 'Dosya Konumu', action: onShowLocation }] },
    { id: 'info', label: 'Bilgi', items: [{ icon: <Info size={13}/>, label: 'Şarkı Bilgisi', action: onShowInfo }] },
  ];

  return (
    <div ref={ref}>
      <div className="fixed z-50 border rounded-xl py-1 shadow-2xl text-xs animate-zoom-in" style={mainStyle}>
        {groups.map((group, idx) => (
          <div key={group.id}>
            {idx > 0 && <div className="h-px my-1" style={{backgroundColor:'var(--border-color)'}} />}
            <div className="flex items-center justify-between px-4 py-2 cursor-pointer transition hover:bg-white/5" onMouseEnter={() => setHoveredGroup(group.id)} onClick={() => setHoveredGroup(hoveredGroup === group.id ? null : group.id)}>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>{group.label}</span>
              <span style={{color:'var(--text-secondary)', fontSize:'8px'}}>▶</span>
            </div>
          </div>
        ))}
        <div className="h-px my-1" style={{backgroundColor:'var(--border-color)'}} />
        <CtxItem icon={<Trash2 size={13}/>} label="Sil (Del)" onClick={onDelete} className="text-red-500" />

        {showCategoryPicker && (
          <div className="absolute left-full ml-1 top-0 border rounded-xl py-1 shadow-2xl text-xs z-50" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)', minWidth:'180px'}}>
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Kategori Ata</div>
            <div className="h-px" style={{backgroundColor:'var(--border-color)'}} />
            {(categories || []).map(cat => (
              <MenuItem key={cat.id} icon={<Tag size={12}/>} label={cat.name} onClick={() => { onAssignCategory(cat.id, track?.id); onClose(); }} />
            ))}
          </div>
        )}

        {showPlaylistPicker && (
          <div className="absolute left-full ml-1 top-0 border rounded-xl py-1 shadow-2xl text-xs z-50" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)', minWidth:'180px'}}>
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Çalma Listesine Ekle</div>
            <div className="h-px" style={{backgroundColor:'var(--border-color)'}} />
            {(playlists || []).map(pl => (
              <MenuItem key={pl.id} icon={<Clock size={12}/>} label={pl.name} onClick={() => { onAddToPlaylist(pl.id, track?.id); onClose(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
