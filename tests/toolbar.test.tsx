// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toolbar } from '../src/content/Toolbar';
import { DEFAULT_TOOL_STATE } from '../src/shared/types';
import type { DrawMeController } from '../src/content/controller';

vi.mock('webextension-polyfill', () => ({ default: { runtime: { sendMessage: vi.fn() } } }));
afterEach(cleanup);

function controllerFixture(toolState = DEFAULT_TOOL_STATE) {
  const setTool = vi.fn();
  const controller = {
    subscribe(listener: (value: unknown) => void) {
      listener({ toolState, canUndo: false, canRedo: false, visible: true, toast: null });
      return () => undefined;
    },
    animateToolbar: vi.fn(),
    setTool,
    updateTools: vi.fn(),
    updateActiveStyle: vi.fn(),
    setToolbar: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    clear: vi.fn(),
    exportViewport: vi.fn(),
  };
  return { controller: controller as unknown as DrawMeController, setTool };
}

describe('toolbar', () => {
  it('exposes every core tool with accessible names', () => {
    const { controller } = controllerFixture();
    render(<Toolbar controller={controller} />);
    for (const name of ['Hand (V)', 'Select (S)', 'Pen (P)', 'Highlighter (H)', 'Eraser (E)', 'Shape (R)', 'Text (T)']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('activates a chosen tool', () => {
    const { controller, setTool } = controllerFixture();
    render(<Toolbar controller={controller} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hand (V)' }));
    expect(setTool).toHaveBeenCalledWith('hand');
  });

  it('shows independent pen and highlighter profiles', () => {
    const pen = controllerFixture({ ...DEFAULT_TOOL_STATE, activeTool: 'pen' });
    const { unmount } = render(<Toolbar controller={pen.controller} />);
    expect((screen.getByLabelText('Pen color') as HTMLInputElement).value).toBe(DEFAULT_TOOL_STATE.penStyle.color);
    expect((screen.getByLabelText('Pen thickness') as HTMLInputElement).value).toBe(String(DEFAULT_TOOL_STATE.penStyle.width));
    unmount();

    const highlighter = controllerFixture({ ...DEFAULT_TOOL_STATE, activeTool: 'highlighter' });
    render(<Toolbar controller={highlighter.controller} />);
    expect((screen.getByLabelText('Highlighter color') as HTMLInputElement).value).toBe(DEFAULT_TOOL_STATE.highlighterStyle.color);
    expect((screen.getByLabelText('Highlighter thickness') as HTMLInputElement).value).toBe(String(DEFAULT_TOOL_STATE.highlighterStyle.width));
  });
});
