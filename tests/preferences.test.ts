import { describe, expect, it } from 'vitest';
import { DEFAULT_TOOL_STATE, normalizeToolState } from '../src/shared/types';

describe('tool preferences', () => {
  it('keeps pen and highlighter styles independent', () => {
    const state = normalizeToolState({
      ...DEFAULT_TOOL_STATE,
      penStyle: { color: '#112233', width: 3, opacity: 0.9 },
      highlighterStyle: { color: '#ffee66', width: 22, opacity: 0.25 },
    });
    expect(state.penStyle).toEqual({ color: '#112233', width: 3, opacity: 0.9 });
    expect(state.highlighterStyle).toEqual({ color: '#ffee66', width: 22, opacity: 0.25 });
  });

  it('migrates legacy shared controls into both profiles', () => {
    const state = normalizeToolState({ color: '#445566', width: 7, opacity: 0.6, activeTool: 'pen', shape: 'rectangle', toolbar: DEFAULT_TOOL_STATE.toolbar });
    expect(state.penStyle).toEqual({ color: '#445566', width: 7, opacity: 0.6 });
    expect(state.highlighterStyle).toEqual({ color: '#445566', width: 7, opacity: 0.6 });
  });
});
