import React, { useMemo } from 'react';
import { Clock, X, Music } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { HighlightText } from './TrackComponents';

const formatRelativeTime = (ts) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(ts).toLocaleDateString('tr-TR');
};

/**
 * RecentlyPlayed — compact strip showing last 20 tracks.
 * Horizontal scrollable on mobile, grid on desktop.
 */
export default function RecentlyPlayed({ onPlay, limit = 12, searchQuery = '' }) {
  const history = useStore((s) => s.playHistory);
  const tracks = useStore((s) => s.tracks);
  const clearHistory = useStore((s) => s.clearHistory);

  const items = useMemo(() => {
    return history
      .map((e) => tracks.find((t) => t.id === e.trackId))
      .filter(Boolean)
      .slice(0, limit);
  }, [history, tracks, limit]);

  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Clock size={14} />
          Son Çalınanlar
        </h3>
        <button
          onClick={() => { clearHistory(); }}
          className="text-[10px] opacity-60 hover:opacity-100 transition flex items-center gap-1"
          style={{ color: 'var(--text-secondary)' }}
          title="Geçmişi temizle"
        >
          <X size={10} />
          Temizle
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
        {items.map((t, idx) => (
          <div
            key={t.id + '-' + idx}
            onClick={() => onPlay && onPlay(t)}
            className={cn("flex-shrink-0 flex items-center gap-2 p-2 rounded-xl cursor-pointer transition hover:bg-white/5 border")}
            style={{
              width: '180px',
              scrollSnapAlign: 'start',
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
            role="button"
            tabIndex={0}
            aria-label={`${t.title} - ${t.artist}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay && onPlay(t); } }}
          >
            {t.picture ? (
              <img src={t.picture} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <Music size={14} className="opacity-40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold truncate">
                <HighlightText text={t.title} query={searchQuery} />
              </div>
              <div className="text-[9px] truncate" style={{ color: 'var(--text-secondary)' }}>
                <HighlightText text={t.artist} query={searchQuery} />
              </div>
              <div className="text-[8px] opacity-50 mt-0.5">
                {formatRelativeTime(t.lastPlayedAt || Date.now())}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
