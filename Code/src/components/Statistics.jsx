import React, { useMemo } from 'react';
import { TrendingUp, Music, Clock, Headphones, Hash, Activity } from 'lucide-react';
import { useStore } from '../store';

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0 sn';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk`;
  return `${Math.floor(seconds)} sn`;
};

const StatCard = ({ icon, label, value, color = 'var(--color-primary)' }) => (
  <div
    className="p-4 rounded-2xl flex items-center gap-3"
    style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--border-color)' }}
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: color, opacity: 0.15 }}
    >
      <div style={{ color }}>{icon}</div>
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] uppercase tracking-wider opacity-60" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  </div>
);

/**
 * Statistics — listening stats dashboard.
 * Shows: total tracks, total play count, total listening time,
 *        top 5 most-played tracks, top 5 most-played artists.
 */
export default function Statistics() {
  const tracks = useStore((s) => s.tracks);
  const history = useStore((s) => s.playHistory);

  const stats = useMemo(() => {
    const totalTracks = tracks.length;
    const totalPlays = tracks.reduce((sum, t) => sum + (t.playCount || 0), 0);
    const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0) * (t.playCount || 0), 0);

    const topTracks = [...tracks]
      .filter((t) => (t.playCount || 0) > 0)
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 5);

    const artistCounts = {};
    for (const t of tracks) {
      const plays = t.playCount || 0;
      if (plays === 0) continue;
      const key = t.artist || 'Bilinmeyen';
      artistCounts[key] = (artistCounts[key] || 0) + plays;
    }
    const topArtists = Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return { totalTracks, totalPlays, totalDuration, topTracks, topArtists };
  }, [tracks]);

  const avgPlays = stats.totalTracks > 0 ? (stats.totalPlays / stats.totalTracks).toFixed(1) : '0';

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">İstatistikler</h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Dinleme alışkanlıklarınız ve en çok çalınanlar.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={<Music size={18} />}
          label="Toplam Parça"
          value={stats.totalTracks}
          color="var(--color-primary)"
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Toplam Çalma"
          value={stats.totalPlays}
          color="#10b981"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Dinleme Süresi"
          value={formatDuration(stats.totalDuration)}
          color="#f59e0b"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Ortalama/Parça"
          value={avgPlays}
          color="#8b5cf6"
        />
        <StatCard
          icon={<Hash size={18} />}
          label="Geçmiş Boyutu"
          value={`${history.length}/20`}
          color="#06b6d4"
        />
        <StatCard
          icon={<Headphones size={18} />}
          label="Sanatçı Sayısı"
          value={Object.keys(stats.topArtists.reduce((acc, [a]) => { acc[a] = true; return acc; }, {})).length || Object.keys(stats.topArtists).length}
          color="#ec4899"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <TrendingUp size={14} />
            En Çok Çalınan Parçalar
          </h3>
          {stats.topTracks.length === 0 ? (
            <p className="text-xs opacity-50">Henüz veri yok</p>
          ) : (
            <ol className="flex flex-col gap-2 text-xs">
              {stats.topTracks.map((t, i) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="w-5 text-center font-bold opacity-50">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-bold">{t.title}</div>
                    <div className="truncate opacity-60 text-[10px]">{t.artist}</div>
                  </div>
                  <span className="font-mono opacity-70 text-[10px]">{t.playCount}×</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--border-color)' }}
        >
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Headphones size={14} />
            En Çok Çalınan Sanatçılar
          </h3>
          {stats.topArtists.length === 0 ? (
            <p className="text-xs opacity-50">Henüz veri yok</p>
          ) : (
            <ol className="flex flex-col gap-2 text-xs">
              {stats.topArtists.map(([artist, count], i) => (
                <li key={artist} className="flex items-center gap-2">
                  <span className="w-5 text-center font-bold opacity-50">{i + 1}</span>
                  <div className="flex-1 min-w-0 truncate font-bold">{artist}</div>
                  <span className="font-mono opacity-70 text-[10px]">{count}×</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
