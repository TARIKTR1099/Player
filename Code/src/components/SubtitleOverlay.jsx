import React, { useMemo } from 'react';
import { useStore } from '../store';

const SubtitleOverlay = ({ currentTime }) => {
  const { mapping } = useStore();

  const activeCue = useMemo(() => {
    if (!mapping.activeSubtitle || !mapping.subtitleTracks.length) return null;
    const track = mapping.subtitleTracks.find(t => t.id === mapping.activeSubtitle);
    if (!track) return null;
    const adjustedTime = currentTime + mapping.subtitleOffset / 1000;
    return track.cues.find(c => adjustedTime >= c.start && adjustedTime <= c.end) || null;
  }, [mapping.activeSubtitle, mapping.subtitleTracks, mapping.subtitleOffset, currentTime]);

  if (!activeCue) return null;

  return (
    <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center pointer-events-none z-30 px-8">
      <div
        className="text-center px-4 py-2 rounded-lg"
        style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: mapping.subtitleColor || '#ffffff',
          fontSize: `${mapping.subtitleSize || 100}%`,
          maxWidth: '80%',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          lineHeight: 1.4,
        }}
      >
        {activeCue.text}
      </div>
    </div>
  );
};

export default SubtitleOverlay;
