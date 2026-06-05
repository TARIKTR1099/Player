// Chapter marker utility — produces an ordered list of { time, title } points
// for a track. Honors explicit `track.chapters` metadata if present; otherwise
// auto-generates evenly spaced markers (1 per ~60s, max 10, with a final "Son"
// marker if the tail is long enough). Always bounded by track duration.

const formatChapterTitle = (t, dur) => {
  if (t <= 0) return 'Başlangıç';
  if (dur - t < 1) return 'Son';
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  if (mins === 0) return `${secs} sn`;
  if (secs === 0) return `${mins} dk`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const generateChapters = (track, duration) => {
  if (!duration || isNaN(duration) || duration <= 0) return [];
  const dur = Math.floor(duration);

  // 1. Explicit chapter metadata on the track
  if (Array.isArray(track?.chapters) && track.chapters.length > 0) {
    return track.chapters
      .filter((c) => c && typeof c.time === 'number' && c.time >= 0 && c.time <= dur)
      .sort((a, b) => a.time - b.time)
      .slice(0, 10)
      .map((c, i) => ({ time: c.time, title: c.title || `Bölüm ${i + 1}` }));
  }

  // 2. Auto-generate: 1 marker per ~60s, capped at 10. Always start at 0.
  const interval = Math.max(60, Math.floor(dur / 10));
  const chapters = [{ time: 0, title: 'Başlangıç' }];
  for (let t = interval; t < dur && chapters.length < 10; t += interval) {
    chapters.push({ time: t, title: formatChapterTitle(t, dur) });
  }
  const last = chapters[chapters.length - 1];
  if (last && dur - last.time > 30 && chapters.length < 10) {
    chapters.push({ time: dur, title: 'Son' });
  }
  return chapters;
};
