import { describe, it, expect } from 'vitest';
import { generateChapters } from '../utils/chapters';

describe('generateChapters', () => {
  it('returns empty array when duration is missing or invalid', () => {
    expect(generateChapters({}, 0)).toEqual([]);
    expect(generateChapters({}, null)).toEqual([]);
    expect(generateChapters({}, -10)).toEqual([]);
    expect(generateChapters({}, NaN)).toEqual([]);
  });

  it('honors explicit track.chapters metadata', () => {
    const track = {
      chapters: [
        { time: 0, title: 'Intro' },
        { time: 60, title: 'Verse 1' },
        { time: 180, title: 'Chorus' },
      ],
    };
    const chapters = generateChapters(track, 240);
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('Intro');
    expect(chapters[2].time).toBe(180);
  });

  it('clamps explicit chapters to duration and sorts by time', () => {
    const track = {
      chapters: [
        { time: 200, title: 'Coda' },
        { time: 30, title: 'Verse' },
        { time: 9999, title: 'Future' },
      ],
    };
    const chapters = generateChapters(track, 250);
    expect(chapters.map((c) => c.time)).toEqual([30, 200]);
  });

  it('auto-generates markers for a 5-minute track', () => {
    const chapters = generateChapters({}, 300);
    expect(chapters.length).toBeGreaterThanOrEqual(2);
    expect(chapters[0].time).toBe(0);
    expect(chapters[0].title).toBe('Başlangıç');
    // Markers should be ~60s apart for short tracks
    expect(chapters[1].time).toBe(60);
  });

  it('caps auto-generated chapters at 10', () => {
    const chapters = generateChapters({}, 7200); // 2 hours
    expect(chapters.length).toBeLessThanOrEqual(10);
  });

  it('adds a final Son marker when tail is long enough', () => {
    const chapters = generateChapters({}, 180); // 3 minutes
    const last = chapters[chapters.length - 1];
    expect(last.title).toBe('Son');
    expect(last.time).toBe(180);
  });
});
