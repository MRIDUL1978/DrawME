import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ControllerView, DrawMeController } from './controller';
import type { Tool } from '../shared/types';
import { Icon } from './icons';

const tools: Array<{ tool: Tool; label: string; key: 'hand' | 'select' | 'pen' | 'highlighter' | 'eraser' | 'shape' | 'text' }> = [
  { tool: 'hand', label: 'Hand (V)', key: 'hand' },
  { tool: 'select', label: 'Select (S)', key: 'select' },
  { tool: 'pen', label: 'Pen (P)', key: 'pen' },
  { tool: 'highlighter', label: 'Highlighter (H)', key: 'highlighter' },
  { tool: 'eraser', label: 'Eraser (E)', key: 'eraser' },
  { tool: 'shape', label: 'Shape (R)', key: 'shape' },
  { tool: 'text', label: 'Text (T)', key: 'text' },
];

export function Toolbar({ controller }: { controller: DrawMeController }) {
  const [view, setView] = useState<ControllerView | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => controller.subscribe(setView), [controller]);
  useEffect(() => { if (toolbarRef.current) controller.animateToolbar(toolbarRef.current); }, [controller]);
  if (!view) return null;

  const { toolState } = view;
  const activeStyle = toolState.activeTool === 'pen'
    ? toolState.penStyle
    : toolState.activeTool === 'highlighter'
      ? toolState.highlighterStyle
      : { color: toolState.color, width: toolState.width, opacity: toolState.opacity };
  const styleLabel = toolState.activeTool === 'pen' ? 'Pen' : toolState.activeTool === 'highlighter' ? 'Highlighter' : 'Tool';
  const positioned = toolState.toolbar.x !== null && toolState.toolbar.y !== null;
  const style = positioned ? { left: toolState.toolbar.x!, top: toolState.toolbar.y!, bottom: 'auto', transform: 'none' } : undefined;

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, originX: rect.left, originY: rect.top };
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current || !toolbarRef.current) return;
    const rect = toolbarRef.current.getBoundingClientRect();
    const x = Math.max(8, Math.min(innerWidth - rect.width - 8, drag.current.originX + event.clientX - drag.current.startX));
    const y = Math.max(8, Math.min(innerHeight - rect.height - 8, drag.current.originY + event.clientY - drag.current.startY));
    controller.setToolbar({ ...toolState.toolbar, x, y });
  };
  const endDrag = () => { drag.current = null; };

  return (
    <>
      <div ref={toolbarRef} className="dm-toolbar-wrap" style={style}>
        <div className={`dm-toolbar${toolState.toolbar.collapsed ? ' collapsed' : ''}`} role="toolbar" aria-label="DrawMe annotation tools">
          <button className="dm-grip" aria-label="Drag toolbar" title="Drag toolbar" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} />
          <div className="dm-hide-collapse">
            {tools.map(({ tool, label, key }) => (
              <button key={tool} className={`dm-tool${toolState.activeTool === tool ? ' active' : ''}`} aria-pressed={toolState.activeTool === tool} aria-label={label} title={label} onClick={() => controller.setTool(tool)}>
                <Icon name={key} />
              </button>
            ))}
            <span className="dm-separator" aria-hidden="true" />
            <div className="dm-controls">
              <label title={`${styleLabel} color`}>
                <span className="dm-swatch" style={{ background: activeStyle.color, display: 'block' }} />
                <input className="dm-color" style={{ position: 'absolute', opacity: 0, width: 30, height: 30, marginTop: -23 }} aria-label={`${styleLabel} color`} type="color" value={activeStyle.color} onChange={(event) => controller.updateActiveStyle({ color: event.target.value })} />
              </label>
              <input className="dm-range" aria-label={`${styleLabel} thickness`} title={`${styleLabel} thickness ${activeStyle.width}`} type="range" min="1" max="32" value={activeStyle.width} onChange={(event) => controller.updateActiveStyle({ width: Number(event.target.value) })} />
              <input className="dm-range" aria-label={`${styleLabel} opacity`} title={`${styleLabel} opacity ${Math.round(activeStyle.opacity * 100)}%`} type="range" min="0.1" max="1" step="0.05" value={activeStyle.opacity} onChange={(event) => controller.updateActiveStyle({ opacity: Number(event.target.value) })} />
              {toolState.activeTool === 'shape' && (
                <select className="dm-shape" aria-label="Shape type" value={toolState.shape} onChange={(event) => controller.updateTools({ shape: event.target.value as typeof toolState.shape })}>
                  <option value="rectangle">Rectangle</option><option value="ellipse">Ellipse</option><option value="line">Line</option><option value="arrow">Arrow</option>
                </select>
              )}
            </div>
            <span className="dm-separator" aria-hidden="true" />
            <button className="dm-action" aria-label="Undo" title="Undo" disabled={!view.canUndo} onClick={() => controller.undo()}><Icon name="undo" /></button>
            <button className="dm-action" aria-label="Redo" title="Redo" disabled={!view.canRedo} onClick={() => controller.redo()}><Icon name="redo" /></button>
            <button className="dm-action" aria-label="Export annotated view" title="Export PNG" onClick={() => void controller.exportViewport()}><Icon name="export" /></button>
            <button className="dm-action" aria-label="Clear page annotations" title="Clear page" onClick={() => controller.clear()}><Icon name="trash" /></button>
          </div>
          <button className="dm-action" aria-label={toolState.toolbar.collapsed ? 'Expand toolbar' : 'Collapse toolbar'} title={toolState.toolbar.collapsed ? 'Expand toolbar' : 'Collapse toolbar'} onClick={() => controller.setToolbar({ ...toolState.toolbar, collapsed: !toolState.toolbar.collapsed })}>
            <Icon name="collapse" />
          </button>
        </div>
      </div>
      {view.toast && <div className={`dm-toast${view.toast.error ? ' error' : ''}`} role="status">{view.toast.message}</div>}
    </>
  );
}
