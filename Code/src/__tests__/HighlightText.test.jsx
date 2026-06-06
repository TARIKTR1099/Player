import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HighlightText } from '../components/TrackComponents';

describe('HighlightText', () => {
  it('returns text as-is when no query', () => {
    const { container } = render(<HighlightText text="Hello World" query="" />);
    expect(container.textContent).toBe('Hello World');
  });

  it('wraps matching substring in mark', () => {
    const { container } = render(<HighlightText text="Hello World" query="World" />);
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark.textContent).toBe('World');
  });

  it('is case-insensitive', () => {
    const { container } = render(<HighlightText text="Hello WORLD" query="world" />);
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark.textContent).toBe('WORLD');
  });

  it('handles multiple matches', () => {
    const { container } = render(<HighlightText text="ab cd ab" query="ab" />);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(2);
  });

  it('returns text unchanged when no match', () => {
    const { container } = render(<HighlightText text="Hello" query="xyz" />);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('Hello');
  });

  it('handles null text', () => {
    const { container } = render(<HighlightText text={null} query="test" />);
    expect(container.textContent).toBe('');
  });
});
