import { describe, expect, it } from 'vitest';
import { commitHistory, createHistory, redoHistory, undoHistory } from '../src/shared/history';

describe('annotation history', () => {
  it('supports undo and redo', () => {
    const initial = createHistory([1]);
    const changed = commitHistory(initial, [1, 2]);
    expect(undoHistory(changed).present).toEqual([1]);
    expect(redoHistory(undoHistory(changed)).present).toEqual([1, 2]);
  });

  it('caps the past at the configured limit', () => {
    let history = createHistory(0);
    for (let value = 1; value <= 120; value += 1) history = commitHistory(history, value, 100);
    expect(history.past).toHaveLength(100);
    expect(history.past[0]).toBe(20);
  });

  it('structurally shares unchanged values between snapshots', () => {
    const first = { id: 'first' };
    const second = { id: 'second' };
    const initial = [first];
    const history = commitHistory(createHistory(initial), [...initial, second]);
    expect(history.past[0][0]).toBe(first);
    expect(history.present[0]).toBe(first);
    expect(undoHistory(history).present).toBe(initial);
  });
});
