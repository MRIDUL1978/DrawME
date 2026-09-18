import { describe, expect, it } from 'vitest';
import { AnimationFrameGate, appendInkSamples, collectInkSamples, strokeToPath, type InkSample } from '../src/content/ink';

describe('pressure-aware ink', () => {
  it('creates a closed SVG outline', () => {
    const path = strokeToPath([[0, 0, 0.2], [10, 10, 0.6], [20, 4, 1]], 8);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith(' Z')).toBe(true);
  });

  it('returns no path without points', () => {
    expect(strokeToPath([], 4)).toBe('');
  });

  it('collects coalesced samples in document coordinates and retains the endpoint', () => {
    const event = {
      clientX: 15, clientY: 18, pressure: 0,
      getCoalescedEvents: () => [
        { clientX: 10, clientY: 12, pressure: 0.2 },
        { clientX: 14, clientY: 17, pressure: 0.4 },
      ],
    };
    expect(collectInkSamples(event, { x: 100, y: 200 }, { left: 5, top: 7 })).toEqual([
      [105, 205, 0.2],
      [109, 210, 0.4],
      [110, 211, 0.5],
    ]);
  });

  it('falls back to the current pointer event', () => {
    expect(collectInkSamples({ clientX: 8, clientY: 9, pressure: 0 }, { x: 2, y: 3 })).toEqual([[10, 12, 0.5]]);
  });

  it('folds only near-identical samples and preserves tight cursive turns', () => {
    const points: InkSample[] = [[0, 0, 0.5]];
    appendInkSamples(points, [
      [0.05, 0.04, 0.5], [1, 0, 0.5], [1.1, 0.3, 0.5],
      [0.8, 0.6, 0.5], [0.4, 0.3, 0.5], [0.9, 0.1, 0.5],
    ]);
    expect(points).toEqual([
      [0, 0, 0.5], [1, 0, 0.5], [1.1, 0.3, 0.5],
      [0.8, 0.6, 0.5], [0.4, 0.3, 0.5], [0.9, 0.1, 0.5],
    ]);
  });

  it('uses distinct pen and highlighter geometry profiles', () => {
    const points: InkSample[] = [[0, 0, 0.5], [5, 3, 0.5], [10, 0, 0.5]];
    expect(strokeToPath(points, 8, { kind: 'pen', complete: true }))
      .not.toBe(strokeToPath(points, 8, { kind: 'highlighter', complete: true }));
  });

  it('coalesces event bursts into one animation-frame callback and supports cancellation', () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    const cancelled: number[] = [];
    let handle = 0;
    const gate = new AnimationFrameGate(
      (callback) => { callbacks.set(++handle, callback); return handle; },
      (id) => { cancelled.push(id); callbacks.delete(id); },
    );
    let renders = 0;
    expect(gate.schedule(() => { renders += 1; })).toBe(true);
    expect(gate.schedule(() => { renders += 1; })).toBe(false);
    callbacks.get(1)?.(16);
    expect(renders).toBe(1);
    expect(gate.schedule(() => { renders += 1; })).toBe(true);
    gate.cancel();
    expect(cancelled).toEqual([2]);
    expect(renders).toBe(1);
  });
});
