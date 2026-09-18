import { describe, expect, it } from 'vitest';
import { contentPoint, contentScrollOffset, viewportPoint } from '../src/content/scroll';

describe('content-anchored scrolling', () => {
  it('moves an annotation with an internal application scroller', () => {
    const initialScroll = contentScrollOffset(0, 0, { scrollLeft: 0, scrollTop: 100 });
    const storedPoint = contentPoint({ x: 240, y: 200 }, initialScroll);
    expect(storedPoint).toEqual({ x: 240, y: 300 });

    const laterScroll = contentScrollOffset(0, 0, { scrollLeft: 0, scrollTop: 250 });
    expect(viewportPoint(storedPoint, laterScroll)).toEqual({ x: 240, y: 50 });
  });

  it('combines browser-window and nested-container offsets', () => {
    expect(contentScrollOffset(12, 80, { scrollLeft: 8, scrollTop: 320 })).toEqual({ x: 20, y: 400 });
  });
});
